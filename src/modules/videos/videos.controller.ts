import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { VideosService } from './videos.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { VideoResponseDto } from './dto/video-response.dto';

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
  @UseGuards(ClerkAuthGuard)
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
}
