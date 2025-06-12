import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseSetupService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  async setupDatabaseObjects() {
    console.log('🔧 Створення об\'єктів БД...');
    
    await this.createStoredProcedures();
    await this.createTriggers();
    await this.createViews();
    // Видаляємо створення функцій для AWS RDS
    // await this.createFunctions();
    
    console.log('✅ Всі об\'єкти БД створені!');
  }

  private async createStoredProcedures() {
    console.log('📋 Створення збережених процедур...');

    // Процедура 1: Оновлення рейтингу користувача
    await this.dataSource.query(`DROP PROCEDURE IF EXISTS UpdateUserRating`);
    
    await this.dataSource.query(`
      CREATE PROCEDURE UpdateUserRating(
        IN user_id INT
      )
      BEGIN
        DECLARE avg_rating DECIMAL(3,2);
        DECLARE review_count INT;
        
        SELECT 
          COALESCE(AVG(rating), 0),
          COUNT(*)
        INTO avg_rating, review_count
        FROM reviews 
        WHERE reviewed_id = user_id;
        
        UPDATE users 
        SET 
          rating = avg_rating
        WHERE id = user_id;
        
        SELECT CONCAT('Оновлено рейтинг користувача ', user_id, 
                      ' на ', avg_rating, 
                      ' на основі ', review_count, ' відгуків') as result;
      END
    `);

    // Процедура 2: Статистика проекту
    await this.dataSource.query(`DROP PROCEDURE IF EXISTS GetProjectStatistics`);
    
    await this.dataSource.query(`
      CREATE PROCEDURE GetProjectStatistics(
        IN project_id INT
      )
      BEGIN
        SELECT 
          p.title,
          p.budget,
          p.status,
          p.project_type,
          u_client.name as client_name,
          u_freelancer.name as freelancer_name,
          COUNT(DISTINCT b.id) as total_bids,
          COALESCE(AVG(b.amount), 0) as avg_bid_amount,
          COUNT(DISTINCT r.id) as review_count,
          COALESCE(AVG(r.rating), 0) as avg_rating
        FROM projects p
        LEFT JOIN users u_client ON p.client_id = u_client.id
        LEFT JOIN users u_freelancer ON p.freelancer_id = u_freelancer.id
        LEFT JOIN bids b ON p.id = b.project_id
        LEFT JOIN reviews r ON p.id = r.project_id
        WHERE p.id = project_id
        GROUP BY p.id, p.title, p.budget, p.status, p.project_type, u_client.name, u_freelancer.name;
      END
    `);

    // Процедура 3: Розрахунок середнього бюджету клієнта
    await this.dataSource.query(`DROP PROCEDURE IF EXISTS GetClientAvgBudget`);
    
    await this.dataSource.query(`
      CREATE PROCEDURE GetClientAvgBudget(
        IN client_id INT
      )
      BEGIN
        SELECT 
          client_id as id,
          COALESCE(AVG(budget), 0) as avg_budget,
          COUNT(*) as project_count,
          COALESCE(SUM(budget), 0) as total_budget
        FROM projects 
        WHERE client_id = client_id;
      END
    `);

    // Процедура 4: Успішність фрілансера
    await this.dataSource.query(`DROP PROCEDURE IF EXISTS GetFreelancerSuccessRate`);
    
    await this.dataSource.query(`
      CREATE PROCEDURE GetFreelancerSuccessRate(
        IN freelancer_id INT
      )
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
        
        SELECT 
          freelancer_id as id,
          total_bids,
          accepted_bids,
          success_rate;
      END
    `);

    console.log('✅ Збережені процедури створені');
  }

  private async createTriggers() {
    console.log('⚡ Створення тригерів...');

    // Створюємо таблицю для логування змін статусу проектів
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS project_status_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT,
        old_status ENUM('open', 'in_progress', 'completed', 'cancelled'),
        new_status ENUM('open', 'in_progress', 'completed', 'cancelled'),
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_project_id (project_id),
        INDEX idx_changed_at (changed_at)
      )
    `);

    // Створюємо таблицю для логування змін статусу заявок
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

    // Тригер 1: Логування змін статусу проекту
    await this.dataSource.query(`DROP TRIGGER IF EXISTS tr_log_project_status_change`);
    
    await this.dataSource.query(`
      CREATE TRIGGER tr_log_project_status_change
      AFTER UPDATE ON projects
      FOR EACH ROW
      BEGIN
        IF OLD.status != NEW.status THEN
          INSERT INTO project_status_log (project_id, old_status, new_status)
          VALUES (NEW.id, OLD.status, NEW.status);
        END IF;
      END
    `);

    // Тригер 2: Логування змін статусу заявки
    await this.dataSource.query(`DROP TRIGGER IF EXISTS tr_log_bid_status_change`);
    
    await this.dataSource.query(`
      CREATE TRIGGER tr_log_bid_status_change
      AFTER UPDATE ON bids
      FOR EACH ROW
      BEGIN
        IF OLD.status != NEW.status THEN
          INSERT INTO bid_status_log (bid_id, old_status, new_status)
          VALUES (NEW.id, OLD.status, NEW.status);
        END IF;
      END
    `);

    console.log('✅ Тригери створені');
  }

  private async createViews() {
    console.log('👁️ Створення представлень...');

    // View 1: Активні проекти з деталями
    await this.dataSource.query(`DROP VIEW IF EXISTS v_active_projects`);
    
    await this.dataSource.query(`
      CREATE VIEW v_active_projects AS
      SELECT 
        p.id,
        p.title,
        p.description,
        p.budget,
        p.project_type,
        p.status,
        p.created_at,
        p.deadline,
        u.name as client_name,
        u.email as client_email,
        u.city as client_city,
        u.country as client_country,
        (SELECT COUNT(*) FROM bids WHERE project_id = p.id) as bid_count,
        (SELECT COUNT(*) FROM bids WHERE project_id = p.id AND status = 'pending') as pending_bids
      FROM projects p
      JOIN users u ON p.client_id = u.id
      WHERE p.status IN ('open', 'in_progress')
    `);

    // View 2: Топ фрілансери з статистикою
    await this.dataSource.query(`DROP VIEW IF EXISTS v_top_freelancers`);
    
    await this.dataSource.query(`
      CREATE VIEW v_top_freelancers AS
      SELECT 
        u.id,
        u.name,
        u.email,
        u.city,
        u.country,
        u.hourly_rate,
        u.rating,
        u.skills,
        COUNT(DISTINCT p.id) as completed_projects,
        COALESCE(AVG(r.rating), 0) as avg_review_rating,
        COUNT(DISTINCT r.id) as review_count,
        COUNT(DISTINCT b.id) as total_bids,
        SUM(CASE WHEN b.status = 'accepted' THEN 1 ELSE 0 END) as accepted_bids
      FROM users u
      LEFT JOIN projects p ON u.id = p.freelancer_id AND p.status = 'completed'
      LEFT JOIN reviews r ON u.id = r.reviewed_id
      LEFT JOIN bids b ON u.id = b.freelancer_id
      WHERE u.role = 'freelancer' AND u.status = 'active'
      GROUP BY u.id, u.name, u.email, u.city, u.country, u.hourly_rate, u.rating, u.skills
      HAVING u.rating >= 3.0
      ORDER BY u.rating DESC, completed_projects DESC
    `);

    // View 3: Статистика клієнтів
    await this.dataSource.query(`DROP VIEW IF EXISTS v_client_stats`);
    
    await this.dataSource.query(`
      CREATE VIEW v_client_stats AS
      SELECT 
        u.id,
        u.name,
        u.email,
        u.city,
        u.country,
        u.rating,
        COUNT(DISTINCT p.id) as total_projects,
        COALESCE(SUM(p.budget), 0) as total_budget,
        COALESCE(AVG(p.budget), 0) as avg_project_budget,
        COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as completed_projects,
        COUNT(DISTINCT r.id) as reviews_given
      FROM users u
      LEFT JOIN projects p ON u.id = p.client_id
      LEFT JOIN reviews r ON u.id = r.reviewer_id
      WHERE u.role = 'client'
      GROUP BY u.id, u.name, u.email, u.city, u.country, u.rating
      ORDER BY total_budget DESC
    `);

    console.log('✅ Представлення створені');
  }

  async testStoredProcedures() {
    console.log('🧪 Тестування збережених процедур...');
    
    try {
      // Тест 1: Оновлення рейтингу
      const users = await this.dataSource.query(`
        SELECT id, name, rating FROM users 
        WHERE role = 'freelancer' 
        LIMIT 1
      `);
      
      if (users.length > 0) {
        const userId = users[0].id;
        const updateResult = await this.dataSource.query(`CALL UpdateUserRating(?)`, [userId]);
        
        // Тест 2: Статистика проекту
        const projects = await this.dataSource.query(`
          SELECT id FROM projects LIMIT 1
        `);
        
        let projectStats = null;
        if (projects.length > 0) {
          projectStats = await this.dataSource.query(`CALL GetProjectStatistics(?)`, [projects[0].id]);
        }
        
        // Тест 3: Середній бюджет клієнта
        const clients = await this.dataSource.query(`
          SELECT id FROM users WHERE role = 'client' LIMIT 1
        `);
        
        let clientStats = null;
        if (clients.length > 0) {
          clientStats = await this.dataSource.query(`CALL GetClientAvgBudget(?)`, [clients[0].id]);
        }
        
        // Тест 4: Успішність фрілансера
        let freelancerStats = null;
        if (users.length > 0) {
          freelancerStats = await this.dataSource.query(`CALL GetFreelancerSuccessRate(?)`, [users[0].id]);
        }
        
        return {
          success: true,
          tests: {
            userRatingUpdate: updateResult,
            projectStatistics: projectStats,
            clientBudgetStats: clientStats,
            freelancerSuccessRate: freelancerStats
          }
        };
      }
      
      return { success: false, message: 'Немає даних для тестування' };
      
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        message: 'Помилка при тестуванні процедур'
      };
    }
  }

  async testViews() {
    console.log('🧪 Тестування представлень...');
    
    try {
      const activeProjects = await this.dataSource.query(`
        SELECT * FROM v_active_projects LIMIT 5
      `);
      
      const topFreelancers = await this.dataSource.query(`
        SELECT * FROM v_top_freelancers LIMIT 5
      `);
      
      const clientStats = await this.dataSource.query(`
        SELECT * FROM v_client_stats LIMIT 5
      `);
      
      return {
        success: true,
        data: {
          active_projects: activeProjects,
          top_freelancers: topFreelancers,
          client_statistics: clientStats
        }
      };
      
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        message: 'Помилка при тестуванні представлень'
      };
    }
  }

  async testFunctions() {
    console.log('🧪 Тестування "функцій" через процедури...');
    
    try {
      // Замість функцій використовуємо процедури
      const clients = await this.dataSource.query(`
        SELECT id, name FROM users WHERE role = 'client' LIMIT 3
      `);
      
      const freelancers = await this.dataSource.query(`
        SELECT id, name FROM users WHERE role = 'freelancer' LIMIT 3
      `);
      
      const clientResults: { client: string; stats: any }[] = [];
      for (const client of clients) {
        const result = await this.dataSource.query(`CALL GetClientAvgBudget(?)`, [client.id]);
        clientResults.push({
          client: client.name,
          stats: result[0]
        });
      }
      
      const freelancerResults: { freelancer: string; stats: any }[] = [];
      for (const freelancer of freelancers) {
        const result = await this.dataSource.query(`CALL GetFreelancerSuccessRate(?)`, [freelancer.id]);
        freelancerResults.push({
          freelancer: freelancer.name,
          stats: result[0]
        });
      }
      
      return {
        success: true,
        data: {
          client_budget_stats: clientResults,
          freelancer_success_rates: freelancerResults
        }
      };
      
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        message: 'Помилка при тестуванні функцій'
      };
    }
  }
}