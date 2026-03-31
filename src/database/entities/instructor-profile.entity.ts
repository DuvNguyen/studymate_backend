import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum KycStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('instructor_profiles')
export class InstructorProfile {
  @PrimaryColumn({ name: 'user_id' })
  userId: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true, name: 'id_card_url' })
  idCardUrl: string;

  @Column({ nullable: true, name: 'bank_account_name' })
  bankAccountName: string;

  @Column({ nullable: true, name: 'bank_account_number' })
  bankAccountNumber: string;

  @Column({ nullable: true, name: 'bank_name' })
  bankName: string;

  @Column({
    type: 'enum',
    enum: KycStatus,
    default: KycStatus.PENDING,
    name: 'kyc_status',
  })
  kycStatus: KycStatus;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejectionReason: string;

  @Column({ type: 'timestamp', nullable: true, name: 'submitted_at' })
  submittedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'approved_at' })
  approvedAt: Date;

  @Column({ type: 'jsonb', nullable: true, name: 'certificates' })
  certificates: any[];

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
