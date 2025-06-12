import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeederService } from './seeder.service';
import { SeederController } from './seeder.controller';
import { User } from '../User/user.entity';
import { Project } from '../Project/project.entity';
import { Bid } from '../Bid/bid.entity';
import { Review } from '../Review/review.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Project, Bid, Review])],
  controllers: [SeederController],
  providers: [SeederService],
})
export class SeederModule {}