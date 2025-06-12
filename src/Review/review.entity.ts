import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../User/user.entity';
import { Project } from '../Project/project.entity';

@Entity('reviews')
@Index(['rating'])
@Index(['created_at'])
@Index(['project_id'])
@Index(['reviewer_id'])
@Index(['reviewed_id'])
export class Review {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column()
  project_id: number;

  @ApiProperty()
  @Column()
  reviewer_id: number;

  @ApiProperty()
  @Column()
  reviewed_id: number;

  @ApiProperty()
  @Column({ type: 'decimal', precision: 3, scale: 2 })
  rating: number;

  @ApiProperty()
  @Column({ type: 'text', nullable: true })
  comment: string;

  @ApiProperty()
  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Project, project => project.reviews)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => User, user => user.given_reviews)
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: User;

  @ManyToOne(() => User, user => user.received_reviews)
  @JoinColumn({ name: 'reviewed_id' })
  reviewed: User;
}