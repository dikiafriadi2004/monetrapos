import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';
import { Store } from '../stores/store.entity';
import { Employee } from '../employees/employee.entity';
import { Customer } from '../customers/customer.entity';
import { Shift } from '../shifts/shift.entity';
import { TransactionItem } from './transaction-item.entity';
export declare enum TransactionStatus {
    PENDING = "pending",
    COMPLETED = "completed",
    VOIDED = "voided",
    REFUNDED = "refunded"
}
export declare enum PaymentMethodType {
    CASH = "cash",
    QRIS = "qris",
    EDC = "edc",
    BANK_TRANSFER = "bank_transfer",
    E_WALLET = "e_wallet"
}
export declare class Transaction extends BaseEntity {
    companyId: string;
    company: Company;
    storeId: string;
    store: Store;
    shiftId: string;
    shift: Shift;
    employeeId: string;
    employee: Employee;
    customerId: string;
    customer: Customer;
    invoiceNumber: string;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    serviceCharge: number;
    total: number;
    paymentMethod: PaymentMethodType;
    paidAmount: number;
    changeAmount: number;
    customerName: string;
    customerPhone: string;
    status: TransactionStatus;
    voidedAt: Date;
    voidedBy: string;
    voidedByEmployee: Employee;
    voidReason: string;
    notes: string;
    metadata: Record<string, any>;
    items: TransactionItem[];
}
