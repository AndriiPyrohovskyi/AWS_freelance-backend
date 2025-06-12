import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../User/user.entity';
import { Bid } from '../Bid/bid.entity';
import { Review } from '../Review/review.entity';

export enum ProjectStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum ProjectType {
  FIXED = 'fixed',
  HOURLY = 'hourly'
}

@Entity('projects')
@Index(['status'])
@Index(['project_type'])
@Index(['budget'])
@Index(['created_at'])
@Index(['client_id'])
export class Project {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column({ length: 200 })
  title: string;

  @ApiProperty()
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ enum: ProjectType })
  @Column({ type: 'enum', enum: ProjectType })
  project_type: ProjectType;

  @ApiProperty()
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  budget: number;

  @ApiProperty()
  @Column({ type: 'json', nullable: true })
  required_skills: string[];

  @ApiProperty({ enum: ProjectStatus })
  @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.OPEN })
  status: ProjectStatus;

  @ApiProperty()
  @Column({ type: 'datetime', nullable: true })
  deadline: Date;

  @ApiProperty()
  @Column()
  client_id: number;

  @ApiProperty()
  @Column({ nullable: true })
  freelancer_id: number;

  @ApiProperty()
  @Column({ type: 'datetime', nullable: true })
  started_at: Date;

  @ApiProperty()
  @Column({ type: 'datetime', nullable: true })
  completed_at: Date;

  @ApiProperty()
  @CreateDateColumn()
  created_at: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, user => user.client_projects)
  @JoinColumn({ name: 'client_id' })
  client: User;

  @ManyToOne(() => User, user => user.freelancer_projects)
  @JoinColumn({ name: 'freelancer_id' })
  freelancer: User;

  @OneToMany(() => Bid, bid => bid.project)
  bids: Bid[];

  @OneToMany(() => Review, review => review.project)
  reviews: Review[];
}