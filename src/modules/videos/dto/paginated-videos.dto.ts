import { VideoResponseDto } from './video-response.dto';

export class PaginationMetaDto {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class PaginatedVideosDto {
  data: VideoResponseDto[];
  meta: PaginationMetaDto;
}
