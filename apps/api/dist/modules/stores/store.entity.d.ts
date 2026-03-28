import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';
import { Product } from '../products/product.entity';
import { Category } from '../products/category.entity';
import { Employee } from '../employees/employee.entity';
import { Role } from '../roles/role.entity';
import { Tax } from '../taxes/tax.entity';
import { Discount } from '../discounts/discount.entity';
import { Transaction } from '../transactions/transaction.entity';
import { PaymentMethod } from '../payments/payment-method.entity';
import { QrisConfig } from '../payments/qris-config.entity';
export declare enum StoreType {
    RETAIL = "retail",
    FNB = "fnb",
    WAREHOUSE = "warehouse",
    SERVICE = "service"
}
export declare class Store extends BaseEntity {
    companyId: string;
    company: Company;
    name: string;
    code: string;
    type: StoreType;
    phone: string;
    email: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
    latitude: number;
    longitude: number;
    operationalHours: Record<string, {
        open: string;
        close: string;
    }>;
    receiptHeader: string;
    receiptFooter: string;
    receiptLogoUrl: string;
    isActive: boolean;
    products: Product[];
    categories: Category[];
    employees: Employee[];
    roles: Role[];
    taxes: Tax[];
    discounts: Discount[];
    transactions: Transaction[];
    paymentMethods: PaymentMethod[];
    qrisConfigs: QrisConfig[];
    deletedAt: Date;
}
