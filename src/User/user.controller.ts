import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Створити користувача' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Отримати список користувачів' })
  findAll(@Query() queryDto: UserQueryDto) {
    return this.userService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Отримати користувача за ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Оновити користувача' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Видалити користувача' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userService.remove(id);
  }

  // СТАТИСТИКА (АГРЕГАТНІ ЗАПИТИ)
  
  @Get('stats/role')
  @ApiOperation({ summary: 'Статистика користувачів по ролях' })
  async getUserStatsByRole() {
    const data = await this.userService.getUserStatsByRole();
    return { data };
  }

  @Get('stats/cities')
  @ApiOperation({ summary: 'Топ міст по кількості користувачів' })
  async getTopCities() {
    const data = await this.userService.getTopCitiesByUserCount();
    return { data };
  }

  @Get('stats/registration')
  @ApiOperation({ summary: 'Статистика реєстрацій по місяцях' })
  async getRegistrationStats() {
    const data = await this.userService.getUserRegistrationStats();
    return { data };
  }

  @Get('stats/rating-distribution')
  @ApiOperation({ summary: 'Розподіл користувачів по рейтингу' })
  async getRatingDistribution() {
    const data = await this.userService.getUserRatingDistribution();
    return { data };
  }

  // ПІДЗАПИТИ

  @Get('analytics/above-average-projects')
  @ApiOperation({ summary: 'Користувачі з проектами більше середнього' })
  async getUsersWithAboveAverageProjects() {
    const data = await this.userService.getUsersWithAboveAverageProjects();
    return { data };
  }

  @Get('analytics/top-freelancers-by-city')
  @ApiOperation({ summary: 'Топ фрілансери по містах' })
  async getTopFreelancersByCity() {
    const data = await this.userService.getTopFreelancersByCity();
    return { data };
  }

  @Get('analytics/high-budget-project-users')
  @ApiOperation({ summary: 'Користувачі з високобюджетними проектами' })
  async getUsersWithHighBudgetProjects() {
    const data = await this.userService.getUsersWithHighBudgetProjects();
    return { data };
  }

  @Get('analytics/freelancers-applied-to/:clientId')
  @ApiOperation({ summary: 'Фрілансери які подавали заявки конкретному клієнту' })
  async getFreelancersWhoAppliedToClient(@Param('clientId', ParseIntPipe) clientId: number) {
    const data = await this.userService.getFreelancersWhoAppliedToClient(clientId);
    return { data };
  }

  // JOIN ЗАПИТИ

  @Get('joins/active-projects')
  @ApiOperation({ summary: 'Користувачі з активними проектами' })
  async getUsersWithActiveProjects() {
    const data = await this.userService.getUsersWithActiveProjects();
    return { data };
  }

  @Get('joins/freelancers-with-reviews')
  @ApiOperation({ summary: 'Фрілансери з рейтингами відгуків' })
  async getFreelancersWithReviews() {
    const data = await this.userService.getFreelancersWithReviewRatings();
    return { data };
  }

  @Get('joins/clients-with-project-stats')
  @ApiOperation({ summary: 'Клієнти зі статистикою проектів' })
  async getClientsWithProjectStats() {
    const data = await this.userService.getClientsWithProjectStats();
    return { data };
  }

  @Get('joins/freelancers-with-bid-stats')
  @ApiOperation({ summary: 'Фрілансери зі статистикою заявок' })
  async getFreelancersWithBidStats() {
    const data = await this.userService.getFreelancersWithBidStats();
    return { data };
  }

  // АНАЛІЗ ІНДЕКСІВ

  @Get('performance/index-comparison')
  @ApiOperation({ summary: 'Порівняння продуктивності запитів з індексами та без' })
  async compareQueryPerformance() {
    const data = await this.userService.compareQueryPerformance();
    console.log('Controller performance data:', data); // для дебагу
    return { data }; // Обгортаємо в { data }
  }

  // ОБ'ЄКТИ БД

  @Get('db-objects/procedures/:userId')
  @ApiOperation({ summary: 'Тестування збережених процедур' })
  async testStoredProcedures(@Param('userId', ParseIntPipe) userId: number) {
    const data = await this.userService.testStoredProcedures(userId);
    return { data };
  }

  @Get('db-objects/functions/:projectId')
  @ApiOperation({ summary: 'Тестування функцій' })
  async testFunctions(@Param('projectId', ParseIntPipe) projectId: number) {
    const data = await this.userService.testFunctions(projectId);
    return { data };
  }

  @Get('db-objects/views')
  @ApiOperation({ summary: 'Тестування представлень' })
  async testViews() {
    const data = await this.userService.testViews();
    return { data };
  }

  // ТРАНЗАКЦІЇ

  @Post('transactions/create-with-setup')
  @ApiOperation({ summary: 'Створення користувача з транзакцією' })
  async createUserWithTransaction(@Body() createUserDto: CreateUserDto) {
    const data = await this.userService.createUserWithTransaction(createUserDto);
    return { data };
  }

  @Post('transactions/update-rating/:userId')
  @ApiOperation({ summary: 'Оновлення рейтингу користувача через транзакцію' })
  async updateUserRating(@Param('userId', ParseIntPipe) userId: number) {
    const data = await this.userService.updateUserRatingTransaction(userId);
    return { data };
  }

  @Post('db-objects/create')
  @ApiOperation({ summary: 'Створити об\'єкти БД (процедури, функції, представлення, тригери)' })
  async createDatabaseObjects() {
    const data = await this.userService.createDatabaseObjects();
    return { data };
  }
}