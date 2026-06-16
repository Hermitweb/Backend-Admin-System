import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entity/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll(page: number = 1, limit: number = 10, search?: string): Promise<{ items: User[]; total: number }> {
    const query = this.userRepository.createQueryBuilder('user');
    
    if (search) {
      query.where('user.name LIKE :search OR user.email LIKE :search', { search: `%${search}%` });
    }
    
    query.orderBy('user.created_at', 'DESC');
    
    const [items, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    
    return { items, total };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    return this.userRepository.findOne({ where: { email } });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existingUser = await this.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }
    
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    
    const user = this.userRepository.create({
      ...dto,
      password: hashedPassword,
    });
    
    return this.userRepository.save(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    
    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.findByEmail(dto.email);
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email already exists');
      }
    }
    
    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }
    
    Object.assign(user, dto);
    return this.userRepository.save(user);
  }

  async delete(id: string): Promise<void> {
    const result = await this.userRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
  }

  async batchDelete(ids: string[]): Promise<{ affected: number }> {
    const result = await this.userRepository.delete(ids);
    return { affected: result.affected };
  }

  async updateStatus(id: string, status: 'active' | 'inactive'): Promise<User> {
    const user = await this.findOne(id);
    user.status = status;
    return this.userRepository.save(user);
  }
}