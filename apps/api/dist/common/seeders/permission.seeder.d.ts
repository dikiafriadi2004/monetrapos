import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Permission } from '../../modules/roles/permission.entity';
export declare class PermissionSeeder implements OnModuleInit {
    private permissionRepo;
    private readonly logger;
    constructor(permissionRepo: Repository<Permission>);
    onModuleInit(): Promise<void>;
}
