import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentType } from '../../../database/entities/instructor-document.entity';

export class InstructorDocumentDto {
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @IsString()
  title: string;

  @IsString()
  fileUrl: string;
}

export class CertificateDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}

export class UpdateKycDto {
  @IsOptional()
  @IsString()
  idCardUrl?: string;

  @IsOptional()
  @IsString()
  bankAccountName?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstructorDocumentDto)
  documents?: InstructorDocumentDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificateDto)
  certificates?: CertificateDto[];
}
