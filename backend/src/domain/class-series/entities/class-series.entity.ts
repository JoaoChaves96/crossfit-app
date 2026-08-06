import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('class_series')
@Index(['gymId'])
export class ClassSeriesEntity {
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

  // Days of week the series runs on. 0=Sunday … 6=Saturday.
  @Column('int', { array: true })
  weekdays: number[];

  @Column('time')
  scheduledTime: string;

  @Column('integer', { default: 60 })
  duration: number;

  @Column('integer', { nullable: true })
  capacity: number | null;

  @Column('date')
  startDate: Date;

  @Column('date')
  endDate: Date;

  @Column('uuid')
  createdByUserId: string;

  @CreateDateColumn()
  createdAt: Date;
}
