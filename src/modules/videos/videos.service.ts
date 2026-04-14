import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { google, youtube_v3 } from 'googleapis';
import { Readable } from 'stream';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Video, VideoStatus } from '../../database/entities/video.entity';
import { VideoResponseDto } from './dto/video-response.dto';
import { YoutubeUtils } from './utils/youtube-utils';

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);
  private youtube: youtube_v3.Youtube;

  constructor(
    @InjectRepository(Video)
    private readonly videosRepository: Repository<Video>,
    private readonly configService: ConfigService,
  ) {
    // Khởi tạo OAuth2 client với credentials từ .env
    const oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('YOUTUBE_CLIENT_ID'),
      this.configService.get<string>('YOUTUBE_CLIENT_SECRET'),
      // redirect_uri dùng cho Web App credential
      // Giá trị này phải khớp với URI đã cấu hình trong Google Cloud Console
      'https://developers.google.com/oauthplayground',
    );

    oauth2Client.setCredentials({
      refresh_token: this.configService.get<string>('YOUTUBE_REFRESH_TOKEN'),
    });

    this.youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Upload video lên YouTube channel của owner (chung 1 channel).
   * Video được set "unlisted" — không public, chỉ embed được.
   * Sau khi upload thành công, tạo bản ghi Video trong DB với status PENDING.
   *
   * @param file - File buffer từ multer
   * @param uploaderId - ID của user (instructor) đang upload
   * @param title - Tiêu đề video (dùng tên file nếu không có)
   */
  async uploadToYoutube(
    file: Express.Multer.File,
    uploaderId: number,
    title?: string,
  ): Promise<VideoResponseDto> {
    this.logger.log(`Đang upload video "${file.originalname}" lên YouTube...`);

    let youtubeVideoId: string;

    try {
      const stream = Readable.from(file.buffer);

      const response = await this.youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: title ?? file.originalname,
            description: `Uploaded by StudyMate LMS — uploader_id: ${uploaderId}`,
            categoryId: '27', // Education
          },
          status: {
            privacyStatus: 'unlisted', // Không public, chỉ embed
            selfDeclaredMadeForKids: false, // Bắt buộc khai báo không dành cho trẻ em
          },
        },
        media: {
          mimeType: file.mimetype,
          body: stream,
        },
      });

      youtubeVideoId = response.data.id!;
      this.logger.log(`Upload thành công. YouTube Video ID: ${youtubeVideoId}`);
    } catch (err) {
      this.logger.error('YouTube upload thất bại:', err);
      throw new InternalServerErrorException(
        'Không thể upload video lên YouTube. Vui lòng thử lại.',
      );
    }

    // Lưu vào DB với status PROCESSING — chờ hệ thống tự động kiểm duyệt
    const video = this.videosRepository.create({
      uploaderId,
      storageKey: youtubeVideoId,        // YouTube video ID làm storage key
      youtubeVideoId,
      title: title ?? file.originalname,
      cdnUrl: null,                       // Sẽ có sau khi APPROVED
      fileSizeKb: Math.round(file.size / 1024),
      status: VideoStatus.PROCESSING,
    });

    const saved = await this.videosRepository.save(video);
    this.logger.log(`Đã lưu Video record vào DB. ID: ${saved.id}`);

    return this.toDto(saved);
  }

  private toDto(video: Video): VideoResponseDto {
    const dto = new VideoResponseDto();
    dto.id = video.id;
    dto.youtubeVideoId = video.youtubeVideoId;
    dto.storageKey = video.storageKey;
    dto.cdnUrl = video.cdnUrl;
    dto.status = video.status;
    dto.durationSecs = video.durationSecs;
    dto.title = video.title;
    dto.definition = video.definition;
    dto.rejectReason = video.rejectReason;
    dto.fileSizeKb = video.fileSizeKb;
    dto.uploadedAt = video.uploadedAt;
    return dto;
  }

  // ─── Controller Methods ────────────────────────────────────────────────────

  async getInstructorVideos(instructorId: number, status?: VideoStatus): Promise<VideoResponseDto[]> {
    const whereCondition: any = { uploaderId: instructorId };
    if (status) {
      whereCondition.status = status;
    }
    const videos = await this.videosRepository.find({
      where: whereCondition,
      order: { uploadedAt: 'DESC' },
    });
    return videos.map((v) => this.toDto(v));
  }

  async getPendingVideos(): Promise<VideoResponseDto[]> {
    const videos = await this.videosRepository.find({
      where: { status: VideoStatus.PENDING_REVIEW },
      relations: ['uploader'],
      order: { uploadedAt: 'ASC' },
    });
    return videos.map((v) => {
      const dto = this.toDto(v);
      // Gắn thêm email người upload nếu cần
      return dto;
    });
  }

  async reviewVideo(
    videoId: number,
    reviewerId: number,
    status: VideoStatus,
    reason?: string,
  ): Promise<VideoResponseDto> {
    const video = await this.videosRepository.findOne({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video không tồn tại');
    
    if (video.status !== VideoStatus.PENDING_REVIEW) {
      throw new BadRequestException('Video không ở trạng thái chờ duyệt');
    }

    if (status !== VideoStatus.APPROVED && status !== VideoStatus.REJECTED) {
      throw new BadRequestException('Trạng thái duyệt không hợp lệ');
    }

    video.status = status;
    video.reviewedBy = reviewerId;
    video.reviewedAt = new Date();

    if (status === VideoStatus.REJECTED) {
      video.rejectReason = reason || 'Không có lý do';
    } else if (status === VideoStatus.APPROVED) {
      video.cdnUrl = `https://www.youtube.com/embed/${video.youtubeVideoId}`;
    }

    const saved = await this.videosRepository.save(video);
    return this.toDto(saved);
  }

  // ─── Auto Validation (Background Job) ──────────────────────────────────────

  /**
   * Gọi API YouTube để lấy chi tiết 1 video
   */
  async fetchMetadata(youtubeVideoId: string) {
    const response = await this.youtube.videos.list({
      part: ['contentDetails', 'status'],
      id: [youtubeVideoId],
    });
    return response.data.items?.[0];
  }

  /**
   * Chạy mỗi phút (tùy chỉnh) để quét các video đang ở trạng thái PROCESSING
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async autoValidateVideos() {
    const pendingVideos = await this.videosRepository.find({
      where: { status: VideoStatus.PROCESSING },
    });

    if (pendingVideos.length === 0) return;

    this.logger.log(`Tự động kiểm tra ${pendingVideos.length} video đang PROCESSING (Auto-Validation)...`);

    for (const video of pendingVideos) {
      if (!video.youtubeVideoId) continue;
      
      try {
        const metadata = await this.fetchMetadata(video.youtubeVideoId);
        if (!metadata || !metadata.contentDetails || !metadata.status) continue;

        const uploadStatus = metadata.status.uploadStatus;
        if (uploadStatus === 'failed' || uploadStatus === 'rejected') {
          video.status = VideoStatus.REJECTED;
          video.rejectReason = `YouTube xử lý thất bại hoặc từ chối: ${metadata.status?.rejectionReason || uploadStatus}`;
          await this.videosRepository.save(video);
          this.logger.log(`Video #${video.id} bị REJECTED vì YouTube uploadStatus: ${uploadStatus}`);
          continue;
        }

        const durationSecs = YoutubeUtils.parseDurationToSeconds(metadata.contentDetails.duration);
        const definition = metadata.contentDetails.definition; // 'hd' or 'sd'
        
        video.durationSecs = durationSecs;
        video.definition = definition ?? null;

        // Luật kỹ thuật: độ dài từ 2 phút đến 120 phút
        if (durationSecs < 120 || durationSecs > 7200) {
          video.status = VideoStatus.REJECTED;
          video.rejectReason = `Video của bạn đã bị từ chối do vi phạm chất lượng và độ dài (your video was rejected due to quality and length violation) - Độ dài yêu cầu: 2-120 phút.`;
        } else if (definition === 'hd') {
          video.status = VideoStatus.PENDING_REVIEW;
        } else {
          // Nếu định dạng SD, hệ thống đợi tối đa 30 phút. 
          // (Lưu ý: trên Test có thể sửa số 30 thành ngắn hơn)
          const diffMinutes = (Date.now() - video.uploadedAt.getTime()) / (1000 * 60);
          if (diffMinutes > 30) {
            video.status = VideoStatus.REJECTED;
            video.rejectReason = 'Video bị từ chối do vi phạm quy định chất lượng: Video chưa đạt phân giải HD sau 30 phút xử lý.';
          } else {
            // Chưa đủ 30p, vẫn giữ PROCESSING để đợi
            this.logger.log(`Video #${video.id} đang xử lý định dạng (đang SD, đã đợi ${Math.round(diffMinutes)} phút)`);
          }
        }

        await this.videosRepository.save(video);
        if (video.status !== VideoStatus.PROCESSING) {
          this.logger.log(`Video #${video.id} hoàn tất Auto-Validation: chuyển sang ${video.status}`);
        }
      } catch (err: any) {
        this.logger.error(`Lỗi Auto-Validation cho Video #${video.id}:`, err.message);
      }
    }
  }
}
