import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { google, youtube_v3 } from 'googleapis';
import { Readable } from 'stream';
import { Video, VideoStatus } from '../../database/entities/video.entity';
import { VideoResponseDto } from './dto/video-response.dto';

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

    // Lưu vào DB với status PENDING — chờ Staff/Admin review
    const video = this.videosRepository.create({
      uploaderId,
      storageKey: youtubeVideoId,        // YouTube video ID làm storage key
      youtubeVideoId,
      cdnUrl: null,                       // Sẽ có sau khi APPROVED
      fileSizeKb: Math.round(file.size / 1024),
      status: VideoStatus.PENDING,
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
    dto.fileSizeKb = video.fileSizeKb;
    dto.uploadedAt = video.uploadedAt;
    return dto;
  }
}
