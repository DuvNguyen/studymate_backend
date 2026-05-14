import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryResponse } from './uploads.interface';
import { Readable } from 'stream';

@Injectable()
export class UploadsService {
  constructor(@Inject('CLOUDINARY') private readonly cloudinaryConfig: any) {}

  async uploadFile(file: Express.Multer.File): Promise<CloudinaryResponse> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'studymate/kyc_documents',
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            console.error('Lỗi Cloudinary:', error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : 'Unknown cloudinary error';
            return reject(
              new BadRequestException('Lỗi tải ảnh: ' + errorMessage),
            );
          }
          resolve(result as unknown as CloudinaryResponse);
        },
      );

      const readable = new Readable();
      readable.push(file.buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }
}
