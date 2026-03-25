import { BaseEntity } from '../../common/entities';
import { Role } from './role.entity';
export declare class Permission extends BaseEntity {
    code: string;
    name: string;
    description: string;
    category: string;
    roles: Role[];
}
