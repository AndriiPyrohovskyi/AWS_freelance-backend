import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }

  async findAll(search?: string): Promise<User[]> {
    if (search) {
      return this.usersRepository.find({
        where: [
          { name: Like(`%${search}%`) },
          { email: Like(`%${search}%`) },
          { city: Like(`%${search}%`) }
        ]
      });
    }
    return this.usersRepository.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    await this.usersRepository.update(id, updateUserDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  async getStats() {
    const total = await this.usersRepository.count();
    const avgAge = await this.usersRepository
      .createQueryBuilder('user')
      .select('AVG(user.age)', 'avgAge')
      .getRawOne();
    
    const cityStats = await this.usersRepository
      .createQueryBuilder('user')
      .select('user.city', 'city')
      .addSelect('COUNT(*)', 'count')
      .where('user.city IS NOT NULL')
      .groupBy('user.city')
      .getRawMany();

    return {
      total,
      avgAge: Math.round(avgAge.avgAge || 0),
      cityStats
    };
  }
}