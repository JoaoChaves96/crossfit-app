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

@Entity('spaces')
@Index(['gymId'])
export class SpaceEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  gymId: string;

  @Column('varchar')
  name: string;

  @Column('integer')
  baseCapacity: number;

  @Column('timestamp', { nullable: true })
  deletedAt: Date | null;

  // Relationships
  @ManyToOne(() => GymEntity, (gym) => gym.spaces)
  @JoinColumn({ name: 'gymId' })
  gym: GymEntity;

  @OneToMany(() => ClassEntity, (cls) => cls.space)
  classes: ClassEntity[];
}
