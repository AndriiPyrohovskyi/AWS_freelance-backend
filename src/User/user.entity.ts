import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Project } from '../Project/project.entity';
import { Bid } from '../Bid/bid.entity';
import { Review } from '../Review/review.entity';

export enum UserRole {
  CLIENT = 'client',
  FREELANCER = 'freelancer',
  ADMIN = 'admin'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BANNED = 'banned'
}

@Entity('users')
@Index(['role', 'status'])
@Index(['created_at'])
export class User {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column({ length: 100 })
  @Index()
  name: string;

  @ApiProperty()
  @Column({ unique: true })
  email: string;

  @ApiProperty()
  @Column({ length: 255 })
  password: string;

  @ApiProperty({ enum: UserRole })
  @Column({ type: 'enum', enum: UserRole, default: UserRole.CLIENT })
  role: UserRole;

  @ApiProperty({ enum: UserStatus })
  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @ApiProperty()
  @Column({ length: 50, nullable: true })
  city: string;

  @ApiProperty()
  @Column({ length: 50, nullable: true })
  country: string;

  @ApiProperty()
  @Column({ type: 'text', nullable: true })
  bio: string;

  @ApiProperty()
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  hourly_rate: number;

  @ApiProperty()
  @Column({ type: 'json', nullable: true })
  skills: string[];

  @ApiProperty()
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @ApiProperty()
  @Column({ default: 0 })
  total_projects: number;

  @ApiProperty()
  @CreateDateColumn()
  created_at: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Project, project => project.client)
  client_projects: Project[];

  @OneToMany(() => Project, project => project.freelancer)
  freelancer_projects: Project[];

  @OneToMany(() => Bid, bid => bid.freelancer)
  bids: Bid[];

  @OneToMany(() => Review, review => review.reviewer)
  given_reviews: Review[];

  @OneToMany(() => Review, review => review.reviewed)
  received_reviews: Review[];
}