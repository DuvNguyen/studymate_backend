import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { AuthModule } from '../auth/auth.module';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('image')
  @UseGuards(ClerkAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: any) {
    const result = await this.uploadsService.uploadImage(file);
    return {
      success: true,
      data: {
        url: result.secure_url,
        public_id: result.public_id,
      },
    };
  }
}
