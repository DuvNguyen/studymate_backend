import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
  BadRequestException,
  Get,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { VideosService } from './videos.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserStatus } from '../../database/entities/user.entity';
import { VideoResponseDto } from './dto/video-response.dto';
import { VideoStatus } from '../../database/entities/video.entity';

/** Tối đa 500MB per upload */
const MAX_FILE_SIZE = 500 * 1024 * 1024;

/** Chỉ chấp nhận video formats phổ biến */
const ALLOWED_MIMES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
];

@Controller('videos')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  /**
   * POST /api/v1/videos/upload
   * Instructor upload video → backend tự upload lên YouTube channel (unlisted)
   * → lưu DB với status PENDING → chờ Staff/Admin duyệt (APPROVED/REJECTED)
   *
   * Body (multipart/form-data):
   *   - file: File video (mp4, webm, mov, avi, mkv) — tối đa 500MB
   *   - title?: string — tiêu đề video (optional, mặc định dùng tên file)
   */
  @Post('upload')
  @Roles('INSTRUCTOR', 'ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // Giữ trong RAM — stream thẳng lên YouTube
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Định dạng không hỗ trợ: ${file.mimetype}. Chỉ chấp nhận mp4, webm, mov, avi, mkv.`,
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
    @Body('title') title?: string,
  ): Promise<VideoResponseDto> {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file video để upload.');
    }

    return this.videosService.uploadToYoutube(file, user.id, title);
  }

  /**
   * GET /api/v1/videos/instructor
   * Giảng viên lấy danh sách video do mình upload
   */
  @Get('instructor')
  @Roles('INSTRUCTOR', 'ADMIN')
  async getInstructorVideos(@CurrentUser() user: User): Promise<VideoResponseDto[]> {
    return this.videosService.getInstructorVideos(user.id);
  }

  /**
   * GET /api/v1/videos/pending
   * Staff/Admin lấy danh sách video đang chờ duyệt
   */
  @Get('pending')
  @Roles('STAFF', 'ADMIN')
  async getPendingVideos(): Promise<VideoResponseDto[]> {
    return this.videosService.getPendingVideos();
  }

  /**
   * PATCH /api/v1/videos/:id/review
   * Staff/Admin duyệt video (Approve hoặc Reject)
   */
  @Post(':id/review')
  @Roles('STAFF', 'ADMIN')
  async reviewVideo(
    @Param('id') id: number,
    @CurrentUser() user: User,
    @Body('status') status: VideoStatus,
    @Body('reason') reason?: string,
  ): Promise<VideoResponseDto> {
    return this.videosService.reviewVideo(id, user.id, status, reason);
  }
}
