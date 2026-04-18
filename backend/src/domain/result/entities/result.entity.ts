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

@Entity('results')
@Index(['classId', 'userId'])
export class ResultEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  classId: string;

  @Column('uuid')
  userId: string;

  @Column({
    type: 'varchar',
    enum: ['time', 'reps', 'weight', 'rounds', 'note'],
  })
  metricType: 'time' | 'reps' | 'weight' | 'rounds' | 'note';

  @Column('varchar')
  value: string;

  @Column({
    type: 'varchar',
    enum: ['seconds', 'minutes', 'reps', 'kg', 'lb', 'rounds', 'none'],
  })
  unit: 'seconds' | 'minutes' | 'reps' | 'kg' | 'lb' | 'rounds' | 'none';

  @Column('text', { nullable: true })
  notes: string | null;

  @CreateDateColumn()
  loggedAt: Date;

  @Column('timestamp', { nullable: true })
  editedAt: Date | null;

  // Relationships
  @ManyToOne(() => ClassEntity, (cls) => cls.results)
  @JoinColumn({ name: 'classId' })
  class: ClassEntity;
}
