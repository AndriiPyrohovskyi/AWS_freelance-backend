import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from './User/user.entity';
import { Project } from './Project/project.entity';
import { Bid } from './Bid/bid.entity';
import { Review } from './Review/review.entity';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: configService.get<string>('DB_HOST'),
  port: configService.get<number>('DB_PORT', 3306),
  username: configService.get<string>('DB_USERNAME'),
  password: configService.get<string>('DB_PASSWORD'),
  database: configService.get<string>('DB_DATABASE'),
  entities: [User, Project, Bid, Review],
  synchronize: configService.get<string>('NODE_ENV') === 'development',
  logging: true,
  timezone: '+00:00',
  ssl: {
    rejectUnauthorized: false,
  },
  extra: {
    charset: 'utf8mb4_unicode_ci',
  },
});

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [User, Project, Bid, Review],
  synchronize: process.env.NODE_ENV === 'development',
  logging: true,
  timezone: '+00:00',
  ssl: {
    rejectUnauthorized: false,
  },
  extra: {
    charset: 'utf8mb4_unicode_ci',
  },
};