import { BaseEntity } from '../../common/entities';
import { TransactionStatus, PaymentMethodType } from '../../common/enums';
import { Store } from '../stores/store.entity';
import { TransactionItem } from './transaction-item.entity';
export declare class Transaction extends BaseEntity {
    invoiceNumber: string;
    status: TransactionStatus;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    total: number;
    paidAmount: number;
    changeAmount: number;
    paymentMethod: PaymentMethodType;
    notes: string;
    customerName: string;
    employeeId: string;
    employeeName: string;
    voidReason: string;
    storeId: string;
    store: Store;
    items: TransactionItem[];
}
