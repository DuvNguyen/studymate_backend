import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { AuthModule } from '../auth/auth.module';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseGuards(ClerkAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|pdf)$/)) {
        return callback(new BadRequestException('Chỉ cho phép tải lên tệp ảnh hoặc PDF'), false);
      }
      callback(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    }
  }))
  async upload(@UploadedFile() file: any) {
    const result = await this.uploadsService.uploadFile(file);
    return {
      success: true,
      data: {
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
      },
    };
  }
}
