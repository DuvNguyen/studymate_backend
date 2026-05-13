import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';
import { OrderItem } from './order-item.entity';
import { Payout } from './payout.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'wallet_id' })
  wallet_id: number;

  @Column({ name: 'order_item_id', nullable: true })
  order_item_id: number;

  @Column({ name: 'payout_id', nullable: true })
  payout_id: number;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @ManyToOne(() => OrderItem)
  @JoinColumn({ name: 'order_item_id' })
  order_item: OrderItem;

  @ManyToOne(() => Payout)
  @JoinColumn({ name: 'payout_id' })
  payout: Payout;

  @Column({ name: 'transaction_type' })
  transaction_type: string; // EARNING, WITHDRAWAL, REFUND, PLATFORM_FEE

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column()
  status: string; // LOCKED, AVAILABLE, RELEASED, CANCELLED

  @Column('decimal', {
    precision: 10,
    scale: 2,
    default: 0,
    name: 'balance_after',
  })
  balance_after: number;

  @Column({ type: 'timestamp', nullable: true, name: 'locked_until' })
  locked_until: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'released_at' })
  released_at: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
