import { Expose } from 'class-transformer';

export class VideoResponseDto {
  @Expose()
  id: number;

  @Expose()
  youtubeVideoId: string | null;

  @Expose()
  storageKey: string;

  @Expose()
  cdnUrl: string | null;

  @Expose()
  status: string;

  @Expose()
  durationSecs: number | null;

  @Expose()
  fileSizeKb: number | null;

  @Expose()
  uploadedAt: Date;
}
