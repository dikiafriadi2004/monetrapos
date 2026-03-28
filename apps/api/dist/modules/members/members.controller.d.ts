import { MembersService } from './members.service';
import { CreateMemberDto, UpdateMemberDto } from './dto';
export declare class MembersController {
    private readonly membersService;
    constructor(membersService: MembersService);
    getProfile(req: any): Promise<import("./member.entity").Member>;
    updateProfile(req: any, dto: UpdateMemberDto): Promise<import("./member.entity").Member>;
    create(req: any, dto: CreateMemberDto): Promise<import("./member.entity").Member>;
    findAll(req: any): Promise<import("./member.entity").Member[]>;
    findOne(req: any, id: string): Promise<import("./member.entity").Member>;
    update(req: any, id: string, dto: UpdateMemberDto): Promise<import("./member.entity").Member>;
    remove(req: any, id: string): Promise<void>;
}
