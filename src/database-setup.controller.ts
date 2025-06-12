import { Controller, Post, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DatabaseSetupService } from './database-setup.service';

@ApiTags('database-setup')
@Controller('database-setup')
export class DatabaseSetupController {
  constructor(private readonly dbSetupService: DatabaseSetupService) {}

  @Post('create-objects')
  @ApiOperation({ summary: 'Create all database objects (procedures, triggers, views, functions)' })
  @ApiResponse({ status: 200, description: 'Database objects created successfully' })
  async createDatabaseObjects() {
    try {
      await this.dbSetupService.setupDatabaseObjects();
      return { 
        success: true,
        message: 'Database objects created successfully!' 
      };
    } catch (error) {
      return { 
        success: false,
        message: 'Error creating database objects',
        error: error.message 
      };
    }
  }

  @Get('test-procedures')
  @ApiOperation({ summary: 'Test stored procedures' })
  @ApiResponse({ status: 200, description: 'Procedures tested successfully' })
  async testProcedures() {
    try {
      const result = await this.dbSetupService.testStoredProcedures();
      return { 
        success: true,
        data: result 
      };
    } catch (error) {
      return { 
        success: false,
        message: 'Error testing procedures',
        error: error.message 
      };
    }
  }

  @Get('test-views')
  @ApiOperation({ summary: 'Test views' })
  @ApiResponse({ status: 200, description: 'Views tested successfully' })
  async testViews() {
    try {
      const result = await this.dbSetupService.testViews();
      return { 
        success: true,
        data: result 
      };
    } catch (error) {
      return { 
        success: false,
        message: 'Error testing views',
        error: error.message 
      };
    }
  }

  @Get('test-functions')
  @ApiOperation({ summary: 'Test functions' })
  @ApiResponse({ status: 200, description: 'Functions tested successfully' })
  async testFunctions() {
    try {
      const result = await this.dbSetupService.testFunctions();
      return { 
        success: true,
        data: result 
      };
    } catch (error) {
      return { 
        success: false,
        message: 'Error testing functions',
        error: error.message 
      };
    }
  }
}