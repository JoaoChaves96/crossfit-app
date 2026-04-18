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

@Entity('attendance')
@Index(['classId', 'userId'])
export class AttendanceEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  classId: string;

  @Column('uuid')
  userId: string;

  @Column('boolean')
  present: boolean;

  @CreateDateColumn()
  markedAt: Date;

  @Column('uuid')
  markedByUserId: string;

  @Column('text', { nullable: true })
  notes: string | null;

  // Relationships
  @ManyToOne(() => ClassEntity, (cls) => cls.attendance)
  @JoinColumn({ name: 'classId' })
  class: ClassEntity;
}
