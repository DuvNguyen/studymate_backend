import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('profiles')
export class Profile {
  @PrimaryColumn({ name: 'user_id' })
  userId: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true, name: 'full_name' })
  fullName: string;

  @Column({ unique: true, nullable: true, name: 'phone_number' })
  phoneNumber: string;

  @Column({ type: 'date', nullable: true, name: 'birth_date' })
  birthDate: Date;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
