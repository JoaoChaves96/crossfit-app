import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { GymEntity } from '../../gym/entities/gym.entity';
import { ClassEntity } from '../../class/entities/class.entity';

@Entity('class_types')
@Index(['gymId'])
export class ClassTypeEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  gymId: string;

  @Column('varchar')
  name: string;

  @Column('boolean', { default: false })
  loggable: boolean;

  @Column({
    type: 'varchar',
    enum: ['time', 'reps', 'weight', 'rounds', 'none'],
    default: 'none',
  })
  resultMetrics: 'time' | 'reps' | 'weight' | 'rounds' | 'none';

  @Column('timestamp', { nullable: true })
  deletedAt: Date | null;

  // Relationships
  @ManyToOne(() => GymEntity, (gym) => gym.classTypes)
  @JoinColumn({ name: 'gymId' })
  gym: GymEntity;

  @OneToMany(() => ClassEntity, (cls) => cls.classType)
  classes: ClassEntity[];
}
