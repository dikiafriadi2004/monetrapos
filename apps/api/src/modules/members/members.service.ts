import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member } from './member.entity';
import { UpdateMemberDto } from './dto/update-member.dto';

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(Member)
    private memberRepo: Repository<Member>,
  ) {}

  async findAllByCompany(companyId: string): Promise<Member[]> {
    return this.memberRepo.find({ where: { companyId } });
  }

  async findOneByCompany(companyId: string, memberId: string): Promise<Member> {
    const member = await this.memberRepo.findOne({ where: { id: memberId, companyId } });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  async updateByCompany(companyId: string, memberId: string, dto: UpdateMemberDto): Promise<Member> {
    const member = await this.findOneByCompany(companyId, memberId);
    Object.assign(member, dto);
    return this.memberRepo.save(member);
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
    Object.assign(member, dto);
    return this.memberRepo.save(member);
  }
}
