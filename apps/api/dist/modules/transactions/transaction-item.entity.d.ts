import { BaseEntity } from '../../common/entities';
import { Transaction } from './transaction.entity';
export declare class TransactionItem extends BaseEntity {
    productName: string;
    variantName: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    subtotal: number;
    notes: string;
    productId: string;
    transactionId: string;
    transaction: Transaction;
}
