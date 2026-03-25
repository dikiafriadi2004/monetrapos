import { BaseEntity } from '../../common/entities';
import { StoreType } from '../../common/enums';
import { Member } from '../members/member.entity';
import { Product } from '../products/product.entity';
import { Category } from '../products/category.entity';
import { Employee } from '../employees/employee.entity';
import { Role } from '../roles/role.entity';
import { Tax } from '../taxes/tax.entity';
import { Discount } from '../discounts/discount.entity';
import { Transaction } from '../transactions/transaction.entity';
import { PaymentMethod } from '../payments/payment-method.entity';
import { QrisConfig } from '../payments/qris-config.entity';
export declare class Store extends BaseEntity {
    name: string;
    type: StoreType;
    address: string;
    phone: string;
    logo: string;
    operationalHours: Record<string, {
        open: string;
        close: string;
    }>;
    receiptHeader: string;
    receiptFooter: string;
    isActive: boolean;
    memberId: string;
    member: Member;
    products: Product[];
    categories: Category[];
    employees: Employee[];
    roles: Role[];
    taxes: Tax[];
    discounts: Discount[];
    transactions: Transaction[];
    paymentMethods: PaymentMethod[];
    qrisConfigs: QrisConfig[];
}
