import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(data: {
    companyId: string;
    name: string;
    email: string;
    password: string;
    role?: UserRole;
    phone?: string;
  }): Promise<User> {
    // Check if email already exists in company
    const existing = await this.userRepository.findOne({
      where: { companyId: data.companyId, email: data.email },
    });

    if (existing) {
      throw new ConflictException('Email already exists in this company');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = this.userRepository.create({
      ...data,
      passwordHash,
      role: data.role || UserRole.ADMIN,
    });

    return this.userRepository.save(user);
  }

  async findAll(companyId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, companyId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, companyId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string, companyId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email, companyId },
    });
  }

  async update(
    id: string,
    companyId: string,
    data: Partial<{
      name: string;
      email: string;
      phone: string;
      role: UserRole;
      permissions: string[];
      isActive: boolean;
    }>,
  ): Promise<User> {
    const user = await this.findOne(id, companyId);

    // Check email uniqueness if changing
    if (data.email && data.email !== user.email) {
      const existing = await this.userRepository.findOne({
        where: { companyId, email: data.email },
      });

      if (existing) {
        throw new ConflictException('Email already exists in this company');
      }
    }

    Object.assign(user, data);
    return this.userRepository.save(user);
  }

  async updatePassword(
    id: string,
    companyId: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.findOne(id, companyId);
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);
  }

  async verifyEmail(id: string): Promise<void> {
    await this.userRepository.update(id, {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });
  }

  async updateLastLogin(id: string, ip: string): Promise<void> {
    await this.userRepository.update(id, {
      lastLoginAt: new Date(),
      lastLoginIp: ip,
    });
  }

  async remove(id: string, companyId: string): Promise<void> {
    const user = await this.findOne(id, companyId);
    await this.userRepository.softRemove(user);
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }
}
