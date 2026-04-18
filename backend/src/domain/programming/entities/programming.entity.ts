import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ClassEntity } from '../../class/entities/class.entity';

@Entity('programming')
export class ProgrammingEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  classId: string;

  @Column('text')
  content: string;

  @Column('uuid')
  createdByUserId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  lastModifiedAt: Date;

  @Column('uuid', { nullable: true })
  lastModifiedByUserId: string | null;

  // Relationships
  @ManyToOne(() => ClassEntity, (cls) => cls.programming)
  @JoinColumn({ name: 'classId' })
  class: ClassEntity;
}
