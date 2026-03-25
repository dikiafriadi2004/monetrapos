import { BaseEntity } from '../../common/entities';
export declare class AuditLog extends BaseEntity {
    action: string;
    entityType: string;
    entityId: string;
    oldValues: Record<string, any>;
    newValues: Record<string, any>;
    userId: string;
    userType: string;
    ipAddress: string;
}
