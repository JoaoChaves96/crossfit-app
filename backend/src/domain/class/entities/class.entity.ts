import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { GymEntity } from '../../gym/entities/gym.entity';
import { ClassTypeEntity } from '../../class-type/entities/class-type.entity';
import { SpaceEntity } from '../../space/entities/space.entity';
import { UserEntity } from '../../user/entities/user.entity';
import { BookingEntity } from '../../booking/entities/booking.entity';
import { ProgrammingEntity } from '../../programming/entities/programming.entity';
import { AttendanceEntity } from '../../attendance/entities/attendance.entity';
import { ResultEntity } from '../../result/entities/result.entity';

@Entity('classes')
@Index(['gymId', 'state'])
@Index(['gymId', 'scheduledDate'])
@Index(['coachUserId'])
export class ClassEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  gymId: string;

  @Column('uuid')
  classTypeId: string;

  @Column('uuid')
  coachUserId: string;

  @Column('uuid')
  spaceId: string;

  @Column('date')
  scheduledDate: Date;

  @Column('time')
  scheduledTime: string;

  @Column('integer')
  capacity: number;

  @Column('integer', { default: 60 })
  duration: number;

  @Column('uuid', { nullable: true })
  seriesId: string | null;

  @Column('boolean', { default: true })
  loggable: boolean;

  @Column({
    type: 'varchar',
    enum: [
      'published',
      'booking_closed',
      'in_progress',
      'completed',
      'archived',
    ],
    default: 'published',
  })
  state:
    | 'published'
    | 'booking_closed'
    | 'in_progress'
    | 'completed'
    | 'archived';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  lastModifiedAt: Date;

  @Column('timestamp', { nullable: true })
  deletedAt: Date | null;

  // Relationships
  @ManyToOne(() => GymEntity, { eager: true })
  @JoinColumn({ name: 'gymId' })
  gym: GymEntity;

  @ManyToOne(() => ClassTypeEntity, { eager: true })
  @JoinColumn({ name: 'classTypeId' })
  classType: ClassTypeEntity;

  @ManyToOne(() => SpaceEntity, { eager: true })
  @JoinColumn({ name: 'spaceId' })
  space: SpaceEntity;

  @ManyToOne(() => UserEntity, { eager: true })
  @JoinColumn({ name: 'coachUserId' })
  coach: UserEntity;

  @OneToMany(() => BookingEntity, (booking) => booking.class)
  bookings: BookingEntity[];

  @OneToMany(() => ProgrammingEntity, (programming) => programming.class)
  programming: ProgrammingEntity | null;

  @OneToMany(() => AttendanceEntity, (attendance) => attendance.class)
  attendance: AttendanceEntity[];

  @OneToMany(() => ResultEntity, (result) => result.class)
  results: ResultEntity[];
}
