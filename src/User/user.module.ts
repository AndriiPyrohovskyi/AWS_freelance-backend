import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './user.entity';
import { Project } from '../Project/project.entity';
import { Bid } from '../Bid/bid.entity';
import { Review } from '../Review/review.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Project, Bid, Review])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService, TypeOrmModule],
})
export class UserModule {}