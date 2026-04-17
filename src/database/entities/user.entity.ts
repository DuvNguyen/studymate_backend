import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Role } from './role.entity';
import { Profile } from './profile.entity';
import { InstructorProfile } from './instructor-profile.entity';
import { InstructorDocument } from './instructor-document.entity';
import { StaffProfile } from './staff-profile.entity';
import { Course } from './course.entity';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  BANNED = 'BANNED',
  SUSPENDED = 'SUSPENDED',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_users_clerk_id')
  @Column({ unique: true, name: 'clerk_user_id' })
  clerkUserId: string;

  @Index('idx_users_email')
  @Column({ unique: true })
  email: string;

  @Index('idx_users_role')
  @Column({ name: 'role_id' })
  roleId: number;

  @ManyToOne(() => Role, (role) => role.users, { eager: true })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @OneToOne(() => Profile, (profile) => profile.user, { cascade: true })
  profile: Profile;

  @OneToOne(() => InstructorProfile, (ip) => ip.user, { cascade: true })
  instructorProfile: InstructorProfile;

  @OneToOne(() => StaffProfile, (sp) => sp.user, { cascade: true })
  staffProfile: StaffProfile;

  @OneToMany(() => InstructorDocument, (doc) => doc.user, { cascade: true })
  instructorDocuments: InstructorDocument[];

  @OneToMany(() => Course, (course) => course.instructor)
  courses: Course[];

  @Column({ nullable: true, name: 'avatar_url' })
  avatarUrl: string;

  @Column({ default: 0, name: 'violation_count' })
  violationCount: number;

  @Column({
    type: 'varchar',
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ type: 'text', nullable: true, name: 'ban_reason' })
  banReason: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'banned_at' })
  bannedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'unbanned_at' })
  unbannedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
