import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Course } from './course.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true, nullable: false })
  name: string;

  @Index('idx_categories_slug')
  @Column({ type: 'varchar', unique: true, nullable: false })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index('idx_categories_parent')
  @Column({ type: 'int', name: 'parent_id', nullable: true })
  parentId: number | null;

  @ManyToOne(() => Category, (category) => category.children, {
    nullable: true,
  })
  @JoinColumn({ name: 'parent_id' })
  parent: Category | null;

  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];

  @Column({ type: 'varchar', name: 'icon_url', nullable: true })
  iconUrl: string | null;

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => Course, (course) => course.category)
  courses: Course[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
