import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryResponse } from './uploads.interface';
import { Readable } from 'stream';

@Injectable()
export class UploadsService {
  constructor(@Inject('CLOUDINARY') private readonly cloudinaryConfig: any) {}

  async uploadImage(file: any): Promise<CloudinaryResponse> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'studymate/images',
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            console.error('Lỗi Cloudinary:', error);
            return reject(
              new BadRequestException('Lỗi tải ảnh: ' + error.message),
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
