import { Repository } from 'typeorm';
import { Member } from './member.entity';
import { CreateMemberDto, UpdateMemberDto } from './dto';
export declare class MembersService {
    private memberRepo;
    constructor(memberRepo: Repository<Member>);
    create(dto: CreateMemberDto): Promise<Member>;
    findAllByCompany(companyId: string): Promise<Member[]>;
    findOneByCompany(companyId: string, memberId: string): Promise<Member>;
    updateByCompany(companyId: string, memberId: string, dto: UpdateMemberDto): Promise<Member>;
    removeByCompany(companyId: string, memberId: string): Promise<void>;
    getProfile(memberId: string): Promise<Member>;
    updateProfile(memberId: string, dto: UpdateMemberDto): Promise<Member>;
}
