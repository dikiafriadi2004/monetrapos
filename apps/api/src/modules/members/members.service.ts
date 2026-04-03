import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member } from './member.entity';
import { CreateMemberDto, UpdateMemberDto } from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(Member)
    private memberRepo: Repository<Member>,
  ) {}

  async create(dto: CreateMemberDto): Promise<Member> {
    const exists = await this.memberRepo.findOne({
      where: { email: dto.email },
    });
    if (exists) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const member = this.memberRepo.create({
      ...dto,
      password: hashedPassword,
    });

    return this.memberRepo.save(member);
  }

  async findAllByCompany(companyId: string): Promise<Member[]> {
    return this.memberRepo.find({ where: { companyId } });
  }

  async findOneByCompany(companyId: string, memberId: string): Promise<Member> {
    const member = await this.memberRepo.findOne({
      where: { id: memberId, companyId },
    });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  async updateByCompany(
    companyId: string,
    memberId: string,
    dto: UpdateMemberDto,
  ): Promise<Member> {
    const member = await this.findOneByCompany(companyId, memberId);

    if (dto.email && dto.email !== member.email) {
      const exists = await this.memberRepo.findOne({
        where: { email: dto.email },
      });
      if (exists) {
        throw new ConflictException('Email already in use');
      }
    }

    Object.assign(member, dto);
    return this.memberRepo.save(member);
  }

  async removeByCompany(companyId: string, memberId: string): Promise<void> {
    const member = await this.findOneByCompany(companyId, memberId);
    await this.memberRepo.remove(member);
  }

  async getProfile(memberId: string): Promise<Member> {
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  async updateProfile(memberId: string, dto: UpdateMemberDto): Promise<Member> {
    const member = await this.getProfile(memberId);
    if (dto.isActive !== undefined) {
      delete dto.isActive; // Prevent self-activation
    }

    if (dto.email && dto.email !== member.email) {
      const exists = await this.memberRepo.findOne({
        where: { email: dto.email },
      });
      if (exists) {
        throw new ConflictException('Email already in use');
      }
    }

    Object.assign(member, dto);
    return this.memberRepo.save(member);
  }
}
