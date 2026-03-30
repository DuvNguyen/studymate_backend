import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum DocumentType {
  DEGREE = 'DEGREE',
  CERTIFICATE = 'CERTIFICATE',
  AWARD = 'AWARD',
}

@Entity('instructor_documents')
export class InstructorDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: DocumentType,
    name: 'document_type',
  })
  documentType: DocumentType;

  @Column()
  title: string;

  @Column({ name: 'file_url' })
  fileUrl: string;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
