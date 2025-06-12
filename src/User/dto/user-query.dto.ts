import { IsOptional, IsNumber, IsString, IsEnum, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../user.entity';

export class UserQueryDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ required: false, default: 12 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 12;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  search?: string;

  @ApiProperty({ enum: UserRole, required: false })
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  role?: UserRole;

  @ApiProperty({ enum: UserStatus, required: false })
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  status?: UserStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  country?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  minRating?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  maxRating?: number;

  @ApiProperty({ required: false, default: 'created_at' })
  @IsOptional()
  @Transform(({ value }) => value === '' ? 'created_at' : value)
  sortBy?: string = 'created_at';

  @ApiProperty({ required: false, default: 'DESC' })
  @IsOptional()
  @Transform(({ value }) => value === '' ? 'DESC' : value)
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}