import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shift, ShiftStatus } from './shift.entity';
import { Transaction } from '../transactions/transaction.entity';
import { TransactionStatus, PaymentMethodType } from '../../common/enums';
import { OpenShiftDto, CloseShiftDto, ShiftReconciliationDto } from './dto';

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private readonly shiftRepo: Repository<Shift>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  async openShift(
    companyId: string,
    userId: string,
    dto: OpenShiftDto,
  ): Promise<Shift> {
    // Check for existing open shift (by companyId + storeId + userId)
    const existing = await this.shiftRepo.findOne({
      where: [
        { companyId, userId, storeId: dto.storeId, status: ShiftStatus.OPEN },
        { companyId, employeeId: userId, storeId: dto.storeId, status: ShiftStatus.OPEN },
      ],
    });
    if (existing) {
      throw new BadRequestException('Already has an open shift in this store.');
    }

    let openingAmount = dto.openingAmount || 0;
    if (dto.openingCash) {
      // Handle both class instance (with calculateTotal) and plain object
      if (typeof dto.openingCash.calculateTotal === 'function') {
        openingAmount = dto.openingCash.calculateTotal();
      } else {
        const c = dto.openingCash as any;
        openingAmount = (c.cash100k || 0) * 100000 + (c.cash50k || 0) * 50000 +
          (c.cash20k || 0) * 20000 + (c.cash10k || 0) * 10000 +
          (c.cash5k || 0) * 5000 + (c.cash2k || 0) * 2000 +
          (c.cash1k || 0) * 1000 + (c.coins || 0);
      }
    }

    const shift = this.shiftRepo.create({
      companyId,
      userId,          // store as userId (works for both owners and employees)
      employeeId: null as any, // nullable
      storeId: dto.storeId,
      openingCash: openingAmount,
      expectedCash: openingAmount,
      openedAt: new Date(),
      status: ShiftStatus.OPEN,
    });
    return this.shiftRepo.save(shift);
  }

  async closeShift(
    id: string,
    companyId: string,
    userId: string,
    dto: CloseShiftDto,
  ): Promise<Shift> {
    const shift = await this.shiftRepo.findOne({
      where: [
        { id, companyId, userId, status: ShiftStatus.OPEN },
        { id, companyId, employeeId: userId, status: ShiftStatus.OPEN },
        { id, companyId, status: ShiftStatus.OPEN }, // fallback
      ],
    });
    if (!shift) throw new NotFoundException('Active shift not found');

    const expectedCash = await this.calculateExpectedCash(shift);
    shift.expectedCash = expectedCash;
    shift.closingCash = expectedCash;
    shift.cashDifference = 0;
    shift.closedAt = new Date();
    shift.status = ShiftStatus.CLOSED;
    if (dto.notes) shift.closingNotes = dto.notes;

    return this.shiftRepo.save(shift);
  }

  async reconcileShift(
    companyId: string,
    dto: ShiftReconciliationDto,
  ): Promise<Shift> {
    const shift = await this.shiftRepo.findOne({
      where: { id: dto.shiftId, companyId },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.status !== ShiftStatus.CLOSED) {
      throw new BadRequestException('Can only reconcile closed shifts');
    }

    // Calculate actual totals
    const actualCashTotal = dto.actualCash.calculateTotal();
    const actualTotal =
      actualCashTotal +
      dto.actualQris +
      dto.actualEdc +
      dto.actualBankTransfer +
      dto.actualEwallet;

    // Get expected amounts from transactions
    const expectedAmounts = await this.calculateExpectedByPaymentMethod(shift);
    const expectedTotal = Object.values(expectedAmounts).reduce(
      (sum, val) => sum + val,
      0,
    );

    // Calculate variances
    const cashVariance = actualCashTotal - expectedAmounts.cash;
    const qrisVariance = dto.actualQris - expectedAmounts.qris;
    const edcVariance = dto.actualEdc - expectedAmounts.edc;
    const bankTransferVariance =
      dto.actualBankTransfer - expectedAmounts.bankTransfer;
    const ewalletVariance = dto.actualEwallet - expectedAmounts.ewallet;
    const totalVariance = actualTotal - expectedTotal;

    // Update shift with reconciliation data
    shift.closingCash = actualCashTotal;
    shift.cashDifference = totalVariance;
    shift.closingNotes = shift.closingNotes
      ? `${shift.closingNotes} | Reconciliation: ${JSON.stringify({
          expected: expectedAmounts,
          actual: {
            cash: actualCashTotal,
            qris: dto.actualQris,
            edc: dto.actualEdc,
            bankTransfer: dto.actualBankTransfer,
            ewallet: dto.actualEwallet,
          },
          variance: {
            cash: cashVariance,
            qris: qrisVariance,
            edc: edcVariance,
            bankTransfer: bankTransferVariance,
            ewallet: ewalletVariance,
            total: totalVariance,
          },
          notes: dto.notes,
        })}`
      : `Reconciliation completed`;

    return this.shiftRepo.save(shift);
  }

  async getActiveShift(
    companyId: string,
    userId: string,
    storeId: string,
  ): Promise<Shift | null> {
    return this.shiftRepo.findOne({
      where: [
        { companyId, userId, storeId, status: ShiftStatus.OPEN },
        { companyId, employeeId: userId, storeId, status: ShiftStatus.OPEN },
      ],
    });
  }

  async findAll(companyId: string, storeId?: string): Promise<Shift[]> {
    const where: any = { companyId };
    if (storeId) where.storeId = storeId;
    return this.shiftRepo.find({
      where,
      order: { openedAt: 'DESC' },
    });
  }

  async getShiftReport(shiftId: string, companyId: string): Promise<any> {
    const shift = await this.shiftRepo.findOne({
      where: { id: shiftId, companyId },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // Get all transactions during this shift
    const transactions = await this.transactionRepo.find({
      where: { storeId: shift.storeId, status: TransactionStatus.COMPLETED },
      relations: ['items'],
    });

    // Filter transactions by shift time
    const shiftTransactions = transactions.filter((tx) => {
      const txTime = new Date(tx.createdAt);
      const openTime = new Date(shift.openedAt);
      const closeTime = shift.closedAt ? new Date(shift.closedAt) : new Date();
      return txTime >= openTime && txTime <= closeTime;
    });

    const summary = {
      totalTransactions: shiftTransactions.length,
      totalRevenue: shiftTransactions.reduce((sum, tx) => sum + tx.total, 0),
      totalTax: shiftTransactions.reduce((sum, tx) => sum + tx.taxAmount, 0),
      totalDiscount: shiftTransactions.reduce((sum, tx) => sum + tx.discountAmount, 0),
      totalSales: shiftTransactions.reduce((sum, tx) => sum + tx.total, 0),
      cashSales: shiftTransactions.filter(tx => tx.paymentMethod === 'cash').reduce((sum, tx) => sum + tx.total, 0),
      nonCashSales: shiftTransactions.filter(tx => tx.paymentMethod !== 'cash').reduce((sum, tx) => sum + tx.total, 0),
      openingCash: shift.openingCash,
      closingCash: shift.closingCash,
      variance: shift.cashDifference,
      paymentMethods: this.groupByPaymentMethod(shiftTransactions),
    };

    return { shift, summary };
  }

  async addCashToShift(shiftId: string, amount: number): Promise<void> {
    const shift = await this.shiftRepo.findOne({ where: { id: shiftId } });
    if (shift && shift.status === ShiftStatus.OPEN) {
      shift.expectedCash = Number(shift.expectedCash) + Number(amount);
      await this.shiftRepo.save(shift);
    }
  }

  private async calculateExpectedCash(shift: Shift): Promise<number> {
    const transactions = await this.transactionRepo.find({
      where: {
        storeId: shift.storeId,
        status: TransactionStatus.COMPLETED,
        paymentMethod: PaymentMethodType.CASH as any,
      },
    });

    const shiftTransactions = transactions.filter((tx) => {
      const txTime = new Date(tx.createdAt);
      const openTime = new Date(shift.openedAt);
      const closeTime = shift.closedAt ? new Date(shift.closedAt) : new Date();
      return txTime >= openTime && txTime <= closeTime;
    });

    const cashFromTransactions = shiftTransactions.reduce((sum, tx) => sum + tx.total, 0);
    return Number(shift.openingCash) + cashFromTransactions;
  }

  private async calculateExpectedByPaymentMethod(
    shift: Shift,
  ): Promise<Record<string, number>> {
    const transactions = await this.transactionRepo.find({
      where: {
        storeId: shift.storeId,
        employeeId: shift.employeeId,
        status: TransactionStatus.COMPLETED,
      },
    });

    // Filter by shift time
    const shiftTransactions = transactions.filter((tx) => {
      const txTime = new Date(tx.createdAt);
      const openTime = new Date(shift.openedAt);
      const closeTime = shift.closedAt ? new Date(shift.closedAt) : new Date();
      return txTime >= openTime && txTime <= closeTime;
    });

    const amounts = {
      cash: shift.openingCash,
      qris: 0,
      edc: 0,
      bankTransfer: 0,
      ewallet: 0,
    };

    shiftTransactions.forEach((tx) => {
      const method = tx.paymentMethod as string;
      switch (method) {
        case 'cash':
          amounts.cash += tx.total;
          break;
        case 'qris':
          amounts.qris += tx.total;
          break;
        case 'edc':
        case 'card':
          amounts.edc += tx.total;
          break;
        case 'bank_transfer':
          amounts.bankTransfer += tx.total;
          break;
        case 'ewallet':
          amounts.ewallet += tx.total;
          break;
      }
    });

    return amounts;
  }

  private groupByPaymentMethod(
    transactions: Transaction[],
  ): Record<string, any> {
    const grouped: Record<string, any> = {};

    transactions.forEach((tx) => {
      const method = tx.paymentMethod;
      if (!grouped[method]) {
        grouped[method] = {
          count: 0,
          total: 0,
        };
      }
      grouped[method].count++;
      grouped[method].total += tx.total;
    });

    return grouped;
  }
}
