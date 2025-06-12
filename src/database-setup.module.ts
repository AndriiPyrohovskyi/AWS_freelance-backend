import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseSetupController } from './database-setup.controller';
import { DatabaseSetupService } from './database-setup.service';
import { User } from './User/user.entity';
import { Project } from './Project/project.entity';
import { Bid } from './Bid/bid.entity';
import { Review } from './Review/review.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Project, Bid, Review])],
  controllers: [DatabaseSetupController],
  providers: [DatabaseSetupService],
  exports: [DatabaseSetupService],
})
export class DatabaseSetupModule {}