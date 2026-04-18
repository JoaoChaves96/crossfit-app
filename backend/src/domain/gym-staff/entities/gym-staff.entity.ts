import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { GymEntity } from '../../gym/entities/gym.entity';

@Entity('gym_staff')
@Index(['gymId', 'userId'])
@Index(['gymId', 'role'])
export class GymStaffEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  gymId: string;

  @Column('uuid')
  userId: string;

  @Column({
    type: 'varchar',
    enum: ['owner', 'coach'],
  })
  role: 'owner' | 'coach';

  @Column({
    type: 'varchar',
    enum: ['active', 'inactive'],
    default: 'active',
  })
  status: 'active' | 'inactive';

  @CreateDateColumn()
  assignedAt: Date;

  // Relationships
  @ManyToOne(() => GymEntity, (gym) => gym.staff)
  @JoinColumn({ name: 'gymId' })
  gym: GymEntity;
}
