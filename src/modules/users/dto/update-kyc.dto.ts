import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  IsNotEmpty,
  Matches,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentType } from '../../../database/entities/instructor-document.entity';

export class InstructorDocumentDto {
  @IsOptional()
  id?: number;

  @IsEnum(DocumentType)
  documentType: DocumentType;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  fileUrl: string;
}

export class CertificateDto {
  @IsOptional()
  id?: number;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}

export class UpdateKycDto {
  @IsNotEmpty()
  @IsString()
  idCardUrl: string;

  @IsNotEmpty()
  @IsString()
  bankAccountName: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{8,20}$/)
  bankAccountNumber: string;

  @IsNotEmpty()
  @IsString()
  bankName: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InstructorDocumentDto)
  documents: InstructorDocumentDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificateDto)
  certificates?: CertificateDto[];
}
