import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ClassEntity } from '../../class/entities/class.entity';

@Entity('bookings')
@Index(['classId', 'userId'])
export class BookingEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  classId: string;

  @Column('uuid')
  userId: string;

  @Column({
    type: 'varchar',
    enum: ['booked', 'waitlisted', 'cancelled'],
  })
  status: 'booked' | 'waitlisted' | 'cancelled';

  @Column('integer', { nullable: true })
  bookedPosition: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column('timestamp', { nullable: true })
  cancelledAt: Date | null;

  // Relationships
  @ManyToOne(() => ClassEntity, (cls) => cls.bookings)
  @JoinColumn({ name: 'classId' })
  class: ClassEntity;
}
