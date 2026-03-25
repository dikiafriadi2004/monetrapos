import { Repository } from 'typeorm';
import { Member } from './member.entity';
import { UpdateMemberDto } from './dto/update-member.dto';
export declare class MembersService {
    private memberRepo;
    constructor(memberRepo: Repository<Member>);
    findAllByCompany(companyId: string): Promise<Member[]>;
    findOneByCompany(companyId: string, memberId: string): Promise<Member>;
    updateByCompany(companyId: string, memberId: string, dto: UpdateMemberDto): Promise<Member>;
    getProfile(memberId: string): Promise<Member>;
    updateProfile(memberId: string, dto: UpdateMemberDto): Promise<Member>;
}
