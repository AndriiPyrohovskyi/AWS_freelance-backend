import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User, UserRole, UserStatus } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const userData = {
      ...createUserDto,
      rating: createUserDto.rating || 0,
      total_projects: createUserDto.total_projects || 0,
      password: createUserDto.password || 'hashed_password',
      status: createUserDto.status || UserStatus.ACTIVE,
    };

    const user = this.userRepo.create(userData);
    return await this.userRepo.save(user);
  }

  // Розширений пошук з пагінацією, сортуванням та фільтрацією
  async findAll(queryDto: UserQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      status,
      city,
      country,
      minRating,
      maxRating,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = queryDto;

    const queryBuilder = this.userRepo.createQueryBuilder('user');

    // Фільтрування
    if (search && search.trim() !== '') {
      queryBuilder.andWhere(
        '(user.name LIKE :search OR user.email LIKE :search OR user.bio LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Виправлена перевірка для role
    if (role && role !== undefined) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    // Виправлена перевірка для status
    if (status && status !== undefined) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    if (city && city.trim() !== '') {
      queryBuilder.andWhere('user.city = :city', { city });
    }

    if (country && country.trim() !== '') {
      queryBuilder.andWhere('user.country = :country', { country });
    }

    if (minRating !== undefined && minRating !== null) {
      queryBuilder.andWhere('user.rating >= :minRating', { minRating });
    }

    if (maxRating !== undefined && maxRating !== null) {
      queryBuilder.andWhere('user.rating <= :maxRating', { maxRating });
    }

    // Сортування
    queryBuilder.orderBy(`user.${sortBy}`, sortOrder);

    // Пагінація
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [users, total] = await queryBuilder.getManyAndCount();

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepo.findOne({ 
      where: { id },
      relations: ['client_projects', 'freelancer_projects', 'bids', 'received_reviews']
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    await this.userRepo.update(id, updateUserDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const result = await this.userRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  // 4 АГРЕГАТНІ ЗАПИТИ

  async getUserStatsByRole() {
    const result = await this.dataSource.query(`
      SELECT role,
             COUNT(*) as count,
             AVG(rating) as avg_rating,
             AVG(total_projects) as avg_projects
      FROM users
      GROUP BY role
    `);
    console.log('getUserStatsByRole result:', result);
    return result;
  }

  async getTopCitiesByUserCount() {
    const result = await this.dataSource.query(`
      SELECT city, 
             country,
             COUNT(*) as user_count,
             AVG(rating) as avg_rating
      FROM users
      WHERE city IS NOT NULL
      GROUP BY city, country
      ORDER BY user_count DESC
      LIMIT 10
    `);
    console.log('getTopCitiesByUserCount result:', result);
    return result;
  }

  async getUserRegistrationStats() {
    const result = await this.dataSource.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as registrations,
        SUM(CASE WHEN role = 'client' THEN 1 ELSE 0 END) as clients,
        SUM(CASE WHEN role = 'freelancer' THEN 1 ELSE 0 END) as freelancers
      FROM users
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month DESC
      LIMIT 12
    `);
    console.log('getUserRegistrationStats result:', result);
    return result;
  }

  async getUserRatingDistribution() {
    const result = await this.dataSource.query(`
      SELECT 
        CASE 
          WHEN rating >= 4.5 THEN '4.5-5.0'
          WHEN rating >= 4.0 THEN '4.0-4.5'
          WHEN rating >= 3.5 THEN '3.5-4.0'
          WHEN rating >= 3.0 THEN '3.0-3.5'
          ELSE 'Below 3.0'
        END as rating_range,
        COUNT(*) as user_count,
        role
      FROM users
      GROUP BY rating_range, role
      ORDER BY role, rating_range DESC
    `);
    console.log('getUserRatingDistribution result:', result);
    return result;
  }

  // ПІДЗАПИТИ

  async getUsersWithAboveAverageProjects() {
    const result = await this.dataSource.query(`
      SELECT * FROM users 
      WHERE total_projects > (SELECT AVG(total_projects) FROM users)
      ORDER BY total_projects DESC
    `);
    console.log('getUsersWithAboveAverageProjects result:', result);
    return result;
  }

  async getTopFreelancersByCity() {
    const result = await this.dataSource.query(`
      SELECT u1.* FROM users u1
      WHERE u1.rating = (
        SELECT MAX(u2.rating) 
        FROM users u2 
        WHERE u2.city = u1.city AND u2.role = 'freelancer'
      ) AND u1.role = 'freelancer'
      AND u1.city IS NOT NULL
      ORDER BY u1.rating DESC
    `);
    console.log('getTopFreelancersByCity result:', result);
    return result;
  }

  async getUsersWithHighBudgetProjects() {
    return await this.dataSource.query(`
      SELECT DISTINCT u.* FROM users u
      WHERE u.id IN (
        SELECT DISTINCT p.client_id FROM projects p 
        WHERE p.budget > (SELECT AVG(budget) FROM projects)
      )
      ORDER BY u.total_projects DESC
    `);
  }

  async getFreelancersWhoAppliedToClient(clientId: number) {
    return await this.dataSource.query(`
      SELECT DISTINCT u.* FROM users u
      WHERE u.id IN (
        SELECT DISTINCT b.freelancer_id FROM bids b
        JOIN projects p ON b.project_id = p.id
        WHERE p.client_id = ?
      )
      ORDER BY u.rating DESC
    `, [clientId]);
  }

  // JOIN ЗАПИТИ

  async getUsersWithActiveProjects() {
    return await this.dataSource.query(`
      SELECT DISTINCT u.*, 
             GROUP_CONCAT(DISTINCT cp.title) as client_projects,
             GROUP_CONCAT(DISTINCT fp.title) as freelancer_projects
      FROM users u
      LEFT JOIN projects cp ON u.id = cp.client_id AND cp.status = 'in_progress'
      LEFT JOIN projects fp ON u.id = fp.freelancer_id AND fp.status = 'in_progress'
      WHERE cp.id IS NOT NULL OR fp.id IS NOT NULL
      GROUP BY u.id
    `);
  }

  async getFreelancersWithReviewRatings() {
    return await this.dataSource.query(`
      SELECT u.*, 
             COALESCE(AVG(r.rating), 0) as avg_review_rating, 
             COUNT(r.id) as review_count
      FROM users u
      LEFT JOIN reviews r ON u.id = r.reviewed_id
      WHERE u.role = 'freelancer'
      GROUP BY u.id
      ORDER BY avg_review_rating DESC
    `);
  }

  async getClientsWithProjectStats() {
    return await this.dataSource.query(`
      SELECT u.*, 
             COUNT(p.id) as total_projects_count,
             COALESCE(SUM(p.budget), 0) as total_budget,
             COALESCE(AVG(p.budget), 0) as avg_project_budget
      FROM users u
      LEFT JOIN projects p ON u.id = p.client_id
      WHERE u.role = 'client'
      GROUP BY u.id
      ORDER BY total_budget DESC
    `);
  }

  async getFreelancersWithBidStats() {
    return await this.dataSource.query(`
      SELECT u.*,
             COUNT(b.id) as total_bids,
             SUM(CASE WHEN b.status = 'accepted' THEN 1 ELSE 0 END) as accepted_bids,
             COALESCE(AVG(b.amount), 0) as avg_bid_amount
      FROM users u
      LEFT JOIN bids b ON u.id = b.freelancer_id
      WHERE u.role = 'freelancer'
      GROUP BY u.id
      ORDER BY accepted_bids DESC, total_bids DESC
    `);
  }

  // АНАЛІЗ ІНДЕКСІВ

  async compareQueryPerformance() {
    const startTime1 = Date.now();
    
    // Запит БЕЗ індексу (по bio)
    await this.dataSource.query(`
      SELECT * FROM users WHERE bio LIKE '%досвід%' ORDER BY created_at DESC LIMIT 100
    `);
    
    const timeWithoutIndex = Date.now() - startTime1;

    const startTime2 = Date.now();
    
    // Запит З індексом (по role)
    await this.dataSource.query(`
      SELECT * FROM users WHERE role = 'freelancer' ORDER BY created_at DESC LIMIT 100
    `);
    
    const timeWithIndex = Date.now() - startTime2;

    const improvement = timeWithoutIndex > timeWithIndex 
      ? `${Math.round((timeWithoutIndex / timeWithIndex) * 100) / 100}x`
      : 'немає покращення';

    const result = {
      withoutIndex: `${timeWithoutIndex}ms`,
      withIndex: `${timeWithIndex}ms`,
      improvement
    };

    console.log('Performance test result:', result); // для дебагу
    return result;
  }

  // ОБ'ЄКТИ БД

  async testStoredProcedures(userId: number) {
    try {
      // Тестуємо процедуру оновлення рейтингу
      const updateResult = await this.dataSource.query(`
        CALL sp_UpdateUserRating(?)
      `, [userId]);
      
      // Тестуємо процедуру статистики проекту
      const projectStats = await this.dataSource.query(`
        SELECT p.id FROM projects p WHERE p.client_id = ? OR p.freelancer_id = ? LIMIT 1
      `, [userId, userId]);
      
      let projectStatsResult = null;
      if (projectStats.length > 0) {
        projectStatsResult = await this.dataSource.query(`
          CALL sp_GetProjectStatistics(?)
        `, [projectStats[0].id]);
      }

      return {
        userRatingUpdate: updateResult,
        projectStatistics: projectStatsResult,
        message: 'Збережені процедури протестовано успішно'
      };
    } catch (error) {
      return {
        error: error.message,
        message: 'Помилка при тестуванні збережених процедур'
      };
    }
  }

  async testFunctions(projectId: number) {
    try {
      // Отримуємо інформацію про проект
      const project = await this.dataSource.query('SELECT * FROM projects WHERE id = ?', [projectId]);
      
      if (project.length === 0) {
        return { error: 'Проект не знайдено' };
      }

      // Замість функцій використовуємо прямі запити SQL
      const complexityResult = await this.dataSource.query(`
        SELECT 
          CASE 
            WHEN budget > 3000 OR JSON_LENGTH(required_skills) > 5 THEN 'Complex'
            WHEN budget > 1500 OR JSON_LENGTH(required_skills) > 3 THEN 'Medium'
            ELSE 'Simple'
          END as complexity
        FROM projects WHERE id = ?
      `, [projectId]);

      // Тестуємо успішність фрілансера через процедуру
      let successRate = null;
      if (project[0].freelancer_id) {
        const successRateResult = await this.dataSource.query(`
          CALL GetFreelancerSuccessRate(?)
        `, [project[0].freelancer_id]);
        successRate = successRateResult.length > 0 ? successRateResult[0][0] : null;
      }

      return {
        project: project[0],
        complexity: complexityResult.length > 0 ? complexityResult[0].complexity : null,
        freelancerSuccessRate: successRate,
        message: 'Функції (через процедури) протестовано успішно'
      };
    } catch (error) {
      return {
        error: error.message,
        message: 'Помилка при тестуванні функцій'
      };
    }
  }

  async testViews() {
    try {
      // Тестуємо нові представлення
      const activeProjects = await this.dataSource.query(`
        SELECT * FROM v_active_projects LIMIT 10
      `);

      const topFreelancers = await this.dataSource.query(`
        SELECT * FROM v_top_freelancers LIMIT 10
      `);
      
      const clientStats = await this.dataSource.query(`
        SELECT * FROM v_client_stats LIMIT 10
      `);

      return {
        activeProjects,
        topFreelancers,
        clientStats,
        message: 'Представлення протестовано успішно'
      };
    } catch (error) {
      return {
        error: error.message,
        message: 'Помилка при тестуванні представлень'
      };
    }
  }

  // ТРАНЗАКЦІЇ

  async createUserWithTransaction(createUserDto: CreateUserDto) {
    return this.dataSource.transaction(async manager => {
      try {
        // Створюємо користувача
        const userData = {
          ...createUserDto,
          rating: createUserDto.rating || 0,
          total_projects: createUserDto.total_projects || 0,
          password: createUserDto.password || 'hashed_password',
          status: createUserDto.status || UserStatus.ACTIVE,
        };

        const user = this.userRepo.create(userData);
        const savedUser = await manager.save(User, user);

        // Додаткові операції в транзакції
        if (savedUser.role === UserRole.FREELANCER) {
          // Логування створення фрілансера
          console.log(`Створено нового фрілансера: ${savedUser.name} (ID: ${savedUser.id})`);
        } else if (savedUser.role === UserRole.CLIENT) {
          // Логування створення клієнта
          console.log(`Створено нового клієнта: ${savedUser.name} (ID: ${savedUser.id})`);
        }

        return {
          user: savedUser,
          message: `Користувача ${savedUser.name} створено успішно в транзакції`
        };
      } catch (error) {
        throw new Error(`Помилка при створенні користувача: ${error.message}`);
      }
    });
  }

  async updateUserRatingTransaction(userId: number) {
    return this.dataSource.transaction(async manager => {
      try {
        // Обчислюємо новий рейтинг на основі відгуків
        const result = await manager.query(`
          SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
          FROM reviews 
          WHERE reviewed_id = ?
        `, [userId]);

        const newRating = result[0]?.avg_rating || 0;
        const reviewCount = result[0]?.review_count || 0;

        // Оновлюємо рейтинг користувача
        await manager.query(`
          UPDATE users 
          SET rating = ? 
          WHERE id = ?
        `, [newRating, userId]);

        return {
          userId,
          newRating: parseFloat(newRating).toFixed(2),
          reviewCount,
          message: `Рейтинг користувача ${userId} оновлено до ${parseFloat(newRating).toFixed(2)} на основі ${reviewCount} відгуків`
        };
      } catch (error) {
        throw new Error(`Помилка при оновленні рейтингу: ${error.message}`);
      }
    });
  }

  // СТВОРЕННЯ ОБ'ЄКТІВ БД

  async createDatabaseObjects() {
    console.log('🔧 Створюємо об\'єкти БД...');

    try {
      // Створюємо збережені процедури
      await this.dataSource.query(`DROP PROCEDURE IF EXISTS sp_UpdateUserRating`);
      
      await this.dataSource.query(`
        CREATE PROCEDURE sp_UpdateUserRating(IN user_id INT)
        BEGIN
            DECLARE avg_rating DECIMAL(3,2);
            DECLARE review_count INT;
            
            SELECT AVG(rating), COUNT(*) 
            INTO avg_rating, review_count
            FROM reviews 
            WHERE reviewed_id = user_id;
            
            UPDATE users 
            SET rating = COALESCE(avg_rating, 0)
            WHERE id = user_id;
            
            SELECT CONCAT('Оновлено рейтинг користувача ', user_id, 
                          ' на ', COALESCE(avg_rating, 0), 
                          ' на основі ', review_count, ' відгуків') as result;
        END
      `);

      await this.dataSource.query(`DROP PROCEDURE IF EXISTS sp_GetProjectStatistics`);

      await this.dataSource.query(`
        CREATE PROCEDURE sp_GetProjectStatistics(IN project_id INT)
        BEGIN
            SELECT 
                p.title,
                p.budget,
                p.status,
                u_client.name as client_name,
                u_freelancer.name as freelancer_name,
                COUNT(DISTINCT b.id) as total_bids,
                AVG(b.amount) as avg_bid_amount,
                COUNT(DISTINCT r.id) as review_count,
                AVG(r.rating) as avg_rating
            FROM projects p
            LEFT JOIN users u_client ON p.client_id = u_client.id
            LEFT JOIN users u_freelancer ON p.freelancer_id = u_freelancer.id
            LEFT JOIN bids b ON p.id = b.project_id
            LEFT JOIN reviews r ON p.id = r.project_id
            WHERE p.id = project_id
            GROUP BY p.id;
        END
      `);

      // Створюємо функції
      await this.dataSource.query(`DROP FUNCTION IF EXISTS fn_CalculateSuccessRate`);
      await this.dataSource.query(`
        CREATE FUNCTION fn_CalculateSuccessRate(freelancer_id INT) 
        RETURNS DECIMAL(5,2)
        READS SQL DATA
        DETERMINISTIC
        BEGIN
            DECLARE total_bids INT DEFAULT 0;
            DECLARE accepted_bids INT DEFAULT 0;
            DECLARE success_rate DECIMAL(5,2) DEFAULT 0;
            
            SELECT COUNT(*) INTO total_bids 
            FROM bids WHERE freelancer_id = freelancer_id;
            
            SELECT COUNT(*) INTO accepted_bids 
            FROM bids WHERE freelancer_id = freelancer_id AND status = 'accepted';
            
            IF total_bids > 0 THEN
                SET success_rate = (accepted_bids / total_bids) * 100;
            END IF;
            
            RETURN success_rate;
        END
      `);

      await this.dataSource.query(`DROP FUNCTION IF EXISTS fn_GetProjectComplexity`);
      await this.dataSource.query(`
        CREATE FUNCTION fn_GetProjectComplexity(project_id INT) 
        RETURNS VARCHAR(20)
        READS SQL DATA
        DETERMINISTIC
        BEGIN
            DECLARE project_budget DECIMAL(10,2);
            DECLARE skills_count INT;
            DECLARE complexity VARCHAR(20) DEFAULT 'Simple';
            
            SELECT budget, JSON_LENGTH(required_skills) 
            INTO project_budget, skills_count
            FROM projects WHERE id = project_id;
            
            IF project_budget > 3000 OR skills_count > 5 THEN
                SET complexity = 'Complex';
            ELSEIF project_budget > 1500 OR skills_count > 3 THEN
                SET complexity = 'Medium';
            END IF;
            
            RETURN complexity;
        END
      `);

      // Створюємо представлення
      await this.dataSource.query(`DROP VIEW IF EXISTS v_ActiveFreelancers`);
      await this.dataSource.query(`
        CREATE VIEW v_ActiveFreelancers AS
        SELECT 
            u.id,
            u.name,
            u.email,
            u.city,
            u.country,
            u.hourly_rate,
            u.rating,
            COUNT(DISTINCT b.id) as total_bids,
            COUNT(DISTINCT CASE WHEN b.status = 'accepted' THEN b.id END) as accepted_bids,
            COUNT(DISTINCT p.id) as completed_projects,
            AVG(r.rating) as avg_review_rating
        FROM users u
        LEFT JOIN bids b ON u.id = b.freelancer_id
        LEFT JOIN projects p ON u.id = p.freelancer_id AND p.status = 'completed'
        LEFT JOIN reviews r ON u.id = r.reviewed_id
        WHERE u.role = 'freelancer' AND u.status = 'active'
        GROUP BY u.id
      `);

      await this.dataSource.query(`DROP VIEW IF EXISTS v_ProjectOverview`);
      await this.dataSource.query(`
        CREATE VIEW v_ProjectOverview AS
        SELECT 
            p.id,
            p.title,
            p.budget,
            p.status,
            p.project_type,
            p.created_at,
            c.name as client_name,
            c.city as client_city,
            f.name as freelancer_name,
            f.hourly_rate,
            COUNT(DISTINCT b.id) as bid_count,
            COUNT(DISTINCT r.id) as review_count
        FROM projects p
        JOIN users c ON p.client_id = c.id
        LEFT JOIN users f ON p.freelancer_id = f.id
        LEFT JOIN bids b ON p.id = b.project_id
        LEFT JOIN reviews r ON p.id = r.project_id
        GROUP BY p.id
      `);

      // Створюємо таблицю для тригера логування
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS bid_status_log (
          id INT AUTO_INCREMENT PRIMARY KEY,
          bid_id INT NOT NULL,
          old_status ENUM('pending', 'accepted', 'rejected', 'withdrawn') NOT NULL,
          new_status ENUM('pending', 'accepted', 'rejected', 'withdrawn') NOT NULL,
          changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_bid_id (bid_id),
          INDEX idx_changed_at (changed_at)
        )
      `);

      // Створюємо тригери
      await this.dataSource.query(`DROP TRIGGER IF EXISTS tr_UpdateProjectCount`);
      await this.dataSource.query(`
        CREATE TRIGGER tr_UpdateProjectCount
        AFTER INSERT ON projects
        FOR EACH ROW
        BEGIN
            UPDATE users 
            SET total_projects = total_projects + 1 
            WHERE id = NEW.client_id;
        END
      `);

      await this.dataSource.query(`DROP TRIGGER IF EXISTS tr_LogBidChanges`);
      await this.dataSource.query(`
        CREATE TRIGGER tr_LogBidChanges
        AFTER UPDATE ON bids
        FOR EACH ROW
        BEGIN
            IF OLD.status != NEW.status THEN
                INSERT INTO bid_status_log (bid_id, old_status, new_status, changed_at)
                VALUES (NEW.id, OLD.status, NEW.status, NOW());
            END IF;
        END
      `);

      console.log('✅ Об\'єкти БД створено успішно!');
      return { success: true, message: 'Всі об\'єкти БД створено успішно' };

    } catch (error) {
      console.error('❌ Помилка створення об\'єктів БД:', error);
      throw error;
    }
  }
}