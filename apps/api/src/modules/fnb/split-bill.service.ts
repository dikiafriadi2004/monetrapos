import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { TransactionItem } from '../transactions/transaction-item.entity';

export interface SplitByItemsDto {
  splits: Array<{
    label: string; // e.g. "Person 1", "Table A"
    item_ids: string[];
  }>;
}

export interface SplitByAmountDto {
  splits: Array<{
    label: string;
    amount: number;
  }>;
}

@Injectable()
export class SplitBillService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
    @InjectRepository(TransactionItem)
    private itemRepo: Repository<TransactionItem>,
  ) {}

  async splitByItems(companyId: string, transactionId: string, dto: SplitByItemsDto) {
    const transaction = await this.transactionRepo.findOne({
      where: { id: transactionId, companyId },
      relations: ['items', 'items.product'],
    });

    if (!transaction) throw new NotFoundException('Transaction not found');

    const allItemIds = transaction.items.map(i => i.id);
    const usedItemIds = new Set(dto.splits.flatMap(s => s.item_ids));

    // Validate all item IDs exist
    for (const id of usedItemIds) {
      if (!allItemIds.includes(id)) {
        throw new BadRequestException(`Item ${id} not found in transaction`);
      }
    }

    const result = dto.splits.map(split => {
      const items = transaction.items.filter(i => split.item_ids.includes(i.id));
      const subtotal = items.reduce((sum, i) => sum + Number(i.subtotal), 0);
      const taxRatio = Number(transaction.taxAmount) / Number(transaction.subtotal) || 0;
      const tax = subtotal * taxRatio;
      const discountRatio = Number(transaction.discountAmount) / Number(transaction.subtotal) || 0;
      const discount = subtotal * discountRatio;
      const total = subtotal + tax - discount;

      return {
        label: split.label,
        items: items.map(i => ({
          id: i.id,
          name: i.productName,
          quantity: i.quantity,
          price: Number(i.unitPrice),
          subtotal: Number(i.subtotal),
        })),
        subtotal: Math.round(subtotal),
        tax: Math.round(tax),
        discount: Math.round(discount),
        total: Math.round(total),
      };
    });

    return {
      transactionId,
      transactionNumber: transaction.transactionNumber,
      originalTotal: Number(transaction.total),
      splits: result,
      splitTotal: result.reduce((sum, s) => sum + s.total, 0),
    };
  }

  async splitByAmount(companyId: string, transactionId: string, dto: SplitByAmountDto) {
    const transaction = await this.transactionRepo.findOne({
      where: { id: transactionId, companyId },
    });

    if (!transaction) throw new NotFoundException('Transaction not found');

    const totalAmount = Number(transaction.total);
    const splitTotal = dto.splits.reduce((sum, s) => sum + s.amount, 0);

    if (Math.abs(splitTotal - totalAmount) > 1) {
      throw new BadRequestException(
        `Split amounts (${splitTotal}) must equal transaction total (${totalAmount})`
      );
    }

    return {
      transactionId,
      transactionNumber: transaction.transactionNumber,
      originalTotal: totalAmount,
      splits: dto.splits.map(s => ({
        label: s.label,
        amount: s.amount,
      })),
    };
  }

  async getTransactionItems(companyId: string, transactionId: string) {
    const transaction = await this.transactionRepo.findOne({
      where: { id: transactionId, companyId },
      relations: ['items'],
    });

    if (!transaction) throw new NotFoundException('Transaction not found');

    return {
      transactionId,
      transactionNumber: transaction.transactionNumber,
      total: Number(transaction.total),
      items: transaction.items.map(i => ({
        id: i.id,
        name: i.productName,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
      })),
    };
  }
}
