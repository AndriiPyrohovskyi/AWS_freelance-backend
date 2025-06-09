import { IsEmail, IsNotEmpty, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(120)
  age?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  city?: string;
}