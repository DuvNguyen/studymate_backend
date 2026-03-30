import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum StaffDepartment {
  KYC = 'KYC',
  SUPPORT = 'SUPPORT',
  FINANCE = 'FINANCE',
  CONTENT = 'CONTENT',
}

@Entity('staff_profiles')
export class StaffProfile {
  @PrimaryColumn({ name: 'user_id' })
  userId: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ nullable: true, name: 'phone_number' })
  phoneNumber: string;

  @Index('idx_staff_profiles_department')
  @Column({
    type: 'enum',
    enum: StaffDepartment,
    default: StaffDepartment.SUPPORT,
  })
  department: StaffDepartment;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
