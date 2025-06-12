import { Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SeederService } from './seeder.service';

@ApiTags('seeder')
@Controller('seeder')
export class SeederController {
  constructor(private readonly seederService: SeederService) {}

  @Post('seed')
  @ApiOperation({ summary: 'Fill database with fake data' })
  async seedDatabase() {
    await this.seederService.seedAll();
    return { message: 'Database seeded successfully!' };
  }
}