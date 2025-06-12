import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../User/user.entity';
import { Project, ProjectStatus, ProjectType } from '../Project/project.entity';
import { Bid, BidStatus } from '../Bid/bid.entity';
import { Review } from '../Review/review.entity';

@Injectable()
export class SeederService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    @InjectRepository(Bid) private bidRepo: Repository<Bid>,
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
  ) {}

  async seedAll() {
    console.log('🌱 Початок заповнення БД...');
    
    // await this.clearData();
    const users = await this.seedUsers();
    const projects = await this.seedProjects(users);
    await this.seedBids(users, projects);
    await this.seedReviews(users, projects);
    
    console.log('✅ Заповнення БД завершено!');
  }

  // async clearData() {
  //   // Використовуємо query builder для видалення всіх записів
  //   await this.reviewRepo.createQueryBuilder().delete().execute();
  //   await this.bidRepo.createQueryBuilder().delete().execute();
  //   await this.projectRepo.createQueryBuilder().delete().execute();
  //   await this.userRepo.createQueryBuilder().delete().execute();
  // }

  async seedUsers() {
    const skills = [
      ['JavaScript', 'React', 'Node.js'],
      ['Python', 'Django', 'PostgreSQL'],
      ['PHP', 'Laravel', 'MySQL'],
      ['Java', 'Spring', 'Hibernate'],
      ['C#', '.NET', 'SQL Server'],
      ['Vue.js', 'TypeScript', 'Express'],
      ['Angular', 'RxJS', 'MongoDB'],
      ['Flutter', 'Dart', 'Firebase'],
      ['React Native', 'Redux', 'API'],
      ['WordPress', 'CSS', 'HTML']
    ];

    const cities = ['Київ', 'Львів', 'Харків', 'Одеса', 'Дніпро', 'Запоріжжя'];
    const countries = ['Україна', 'Польща', 'Німеччина', 'США', 'Канада'];

    const users: User[] = [];

    // Клієнти
    for (let i = 1; i <= 20; i++) {
      const user = this.userRepo.create({
        name: `Client ${i}`,
        email: `client${i}@example.com`,
        password: 'hashed_password',
        role: UserRole.CLIENT,
        status: Math.random() > 0.1 ? UserStatus.ACTIVE : UserStatus.INACTIVE,
        city: cities[Math.floor(Math.random() * cities.length)],
        country: countries[Math.floor(Math.random() * countries.length)],
        bio: `Досвідчений клієнт з ${Math.floor(Math.random() * 5) + 1} роками роботи`,
        rating: Math.round((Math.random() * 2 + 3) * 100) / 100,
        total_projects: Math.floor(Math.random() * 20),
      });
      users.push(user);
    }

    // Фрілансери
    for (let i = 1; i <= 30; i++) {
      const user = this.userRepo.create({
        name: `Freelancer ${i}`,
        email: `freelancer${i}@example.com`,
        password: 'hashed_password',
        role: UserRole.FREELANCER,
        status: Math.random() > 0.05 ? UserStatus.ACTIVE : UserStatus.BANNED,
        city: cities[Math.floor(Math.random() * cities.length)],
        country: countries[Math.floor(Math.random() * countries.length)],
        bio: `Професійний розробник з ${Math.floor(Math.random() * 8) + 1} роками досвіду`,
        hourly_rate: Math.floor(Math.random() * 80) + 20,
        skills: skills[Math.floor(Math.random() * skills.length)],
        rating: Math.round((Math.random() * 2 + 3) * 100) / 100,
        total_projects: Math.floor(Math.random() * 50),
      });
      users.push(user);
    }

    return await this.userRepo.save(users);
  }

  async seedProjects(users: User[]) {
    const clients = users.filter(u => u.role === UserRole.CLIENT);
    const freelancers = users.filter(u => u.role === UserRole.FREELANCER);
    
    const projectTitles = [
      'Розробка веб-додатку для електронної комерції',
      'Створення мобільного додатку для доставки їжі',
      'Дизайн та розробка корпоративного сайту',
      'Інтеграція API для платіжної системи',
      'Розробка CRM системи',
      'Створення блогу на WordPress',
      'Розробка чат-боту для Telegram',
      'Дизайн UI/UX для мобільного додатку',
      'Розробка системи управління складом',
      'Створення онлайн-курсу платформи'
    ];

    const skillSets = [
      ['React', 'Node.js', 'MongoDB'],
      ['Flutter', 'Firebase', 'API'],
      ['WordPress', 'PHP', 'MySQL'],
      ['Vue.js', 'Laravel', 'PostgreSQL'],
      ['Angular', 'C#', '.NET']
    ];

    const projects: Project[] = [];

    for (let i = 0; i < 50; i++) {
      const client = clients[Math.floor(Math.random() * clients.length)];
      const freelancer = Math.random() > 0.3 ? freelancers[Math.floor(Math.random() * freelancers.length)] : null;
      
      const statuses = [ProjectStatus.OPEN, ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED];
      const status = freelancer ? statuses[Math.floor(Math.random() * statuses.length)] : ProjectStatus.OPEN;
      
      // Виправлення: використовуємо правильний синтаксис create()
      const projectData = {
        title: projectTitles[Math.floor(Math.random() * projectTitles.length)],
        description: `Детальний опис проекту ${i + 1}. Потрібно розробити високоякісне рішення з урахуванням всіх вимог клієнта.`,
        project_type: Math.random() > 0.5 ? ProjectType.FIXED : ProjectType.HOURLY,
        budget: Math.floor(Math.random() * 5000) + 500,
        required_skills: skillSets[Math.floor(Math.random() * skillSets.length)],
        status,
        deadline: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
        client_id: client.id,
        freelancer_id: freelancer?.id || undefined,
        started_at: status !== ProjectStatus.OPEN ? new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000) : undefined,
        completed_at: status === ProjectStatus.COMPLETED ? new Date() : undefined,
      };
      
      const project = this.projectRepo.create(projectData);
      projects.push(project);
    }

    return await this.projectRepo.save(projects);
  }

  async seedBids(users: User[], projects: Project[]) {
    const freelancers = users.filter(u => u.role === UserRole.FREELANCER);
    const bids: Bid[] = [];

    for (const project of projects) {
      const numBids = Math.floor(Math.random() * 5) + 1;
      const bidders = freelancers.sort(() => 0.5 - Math.random()).slice(0, numBids);

      for (const freelancer of bidders) {
        const bidData = {
          project_id: project.id,
          freelancer_id: freelancer.id,
          amount: Math.round(project.budget * (0.7 + Math.random() * 0.6) * 100) / 100,
          proposal: `Пропозиція від ${freelancer.name}. Маю досвід у подібних проектах і готовий виконати роботу якісно та в строк.`,
          delivery_days: Math.floor(Math.random() * 14) + 3,
          status: project.freelancer_id === freelancer.id ? BidStatus.ACCEPTED : 
                  Math.random() > 0.8 ? BidStatus.REJECTED : BidStatus.PENDING,
        };
        
        const bid = this.bidRepo.create(bidData);
        bids.push(bid);
      }
    }

    return await this.bidRepo.save(bids);
  }

  async seedReviews(users: User[], projects: Project[]) {
    const completedProjects = projects.filter(p => p.status === ProjectStatus.COMPLETED);
    const reviews: Review[] = [];

    for (const project of completedProjects) {
      if (Math.random() > 0.3 && project.freelancer_id) {
        // Відгук від клієнта про фрілансера
        const clientReviewData = {
          project_id: project.id,
          reviewer_id: project.client_id,
          reviewed_id: project.freelancer_id,
          rating: Math.round((Math.random() * 2 + 3) * 100) / 100,
          comment: 'Відмінна робота! Фрілансер виконав все в строк і якісно.',
        };
        
        const clientReview = this.reviewRepo.create(clientReviewData);
        reviews.push(clientReview);

        // Відгук від фрілансера про клієнта
        if (Math.random() > 0.5) {
          const freelancerReviewData = {
            project_id: project.id,
            reviewer_id: project.freelancer_id,
            reviewed_id: project.client_id,
            rating: Math.round((Math.random() * 2 + 3) * 100) / 100,
            comment: 'Клієнт був дуже комунікабельним і швидко надавав зворотний зв\'язок.',
          };
          
          const freelancerReview = this.reviewRepo.create(freelancerReviewData);
          reviews.push(freelancerReview);
        }
      }
    }

    return await this.reviewRepo.save(reviews);
  }
}