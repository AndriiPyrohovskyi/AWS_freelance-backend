import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../User/user.entity';
import { Project } from '../Project/project.entity';

export enum BidStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn'
}

@Entity('bids')
@Index(['status'])
@Index(['amount'])
@Index(['created_at'])
@Index(['project_id'])
@Index(['freelancer_id'])
export class Bid {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column()
  project_id: number;

  @ApiProperty()
  @Column()
  freelancer_id: number;

  @ApiProperty()
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @ApiProperty()
  @Column({ type: 'text' })
  proposal: string;

  @ApiProperty()
  @Column({ default: 7 })
  delivery_days: number;

  @ApiProperty({ enum: BidStatus })
  @Column({ type: 'enum', enum: BidStatus, default: BidStatus.PENDING })
  status: BidStatus;

  @ApiProperty()
  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Project, project => project.bids)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => User, user => user.bids)
  @JoinColumn({ name: 'freelancer_id' })
  freelancer: User;
}