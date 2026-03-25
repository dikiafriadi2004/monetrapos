import { MembersService } from './members.service';
import { UpdateMemberDto } from './dto/update-member.dto';
export declare class MembersController {
    private readonly membersService;
    constructor(membersService: MembersService);
    getProfile(req: any): Promise<import("./member.entity").Member>;
    updateProfile(req: any, dto: UpdateMemberDto): Promise<import("./member.entity").Member>;
    findAll(req: any): Promise<import("./member.entity").Member[]>;
    findOne(req: any, id: string): Promise<import("./member.entity").Member>;
    update(req: any, id: string, dto: UpdateMemberDto): Promise<import("./member.entity").Member>;
}
