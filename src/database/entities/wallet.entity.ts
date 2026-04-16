import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, name: 'user_id' })
  user_id: number;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('decimal', { precision: 10, scale: 2, default: 0, name: 'balance_pending' })
  balance_pending: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0, name: 'balance_available' })
  balance_available: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0, name: 'total_earned' })
  total_earned: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
