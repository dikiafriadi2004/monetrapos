import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './expense.entity';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
  ) {}

  async create(companyId: string, userId: string, dto: {
    category: string;
    description: string;
    amount: number;
    expenseDate: string;
    storeId?: string;
    referenceNumber?: string;
    notes?: string;
  }): Promise<Expense> {
    const expense = this.expenseRepo.create({
      companyId,
      createdBy: userId,
      category: dto.category,
      description: dto.description,
      amount: dto.amount,
      expenseDate: new Date(dto.expenseDate),
      storeId: dto.storeId,
      referenceNumber: dto.referenceNumber,
      notes: dto.notes,
    });
    return this.expenseRepo.save(expense);
  }

  async findAll(companyId: string, filters?: {
    startDate?: string;
    endDate?: string;
    category?: string;
    storeId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Expense[]; total: number; totalAmount: number; page: number; limit: number }> {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 50, 200); // max 200 per page

    const qb = this.expenseRepo.createQueryBuilder('e')
      .where('e.companyId = :companyId', { companyId })
      .andWhere('e.deletedAt IS NULL')
      .orderBy('e.expenseDate', 'DESC')
      .addOrderBy('e.createdAt', 'DESC');

    if (filters?.startDate && filters?.endDate) {
      qb.andWhere('e.expenseDate BETWEEN :start AND :end', {
        start: filters.startDate,
        end: filters.endDate,
      });
    }
    if (filters?.category) {
      qb.andWhere('e.category = :category', { category: filters.category });
    }
    if (filters?.storeId) {
      qb.andWhere('e.storeId = :storeId', { storeId: filters.storeId });
    }

    const total = await qb.getCount();
    const data = await qb.skip((page - 1) * limit).take(limit).getMany();
    const totalAmount = data.reduce((sum, e) => sum + Number(e.amount), 0);

    return { data, total, totalAmount, page, limit };
  }

  async findOne(id: string, companyId: string): Promise<Expense> {
    const expense = await this.expenseRepo.findOne({
      where: { id, companyId },
    });
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  async update(id: string, companyId: string, dto: Partial<{
    category: string;
    description: string;
    amount: number;
    expenseDate: string;
    storeId: string;
    referenceNumber: string;
    notes: string;
  }>): Promise<Expense> {
    const expense = await this.findOne(id, companyId);
    if (dto.category) expense.category = dto.category;
    if (dto.description) expense.description = dto.description;
    if (dto.amount !== undefined) expense.amount = dto.amount;
    if (dto.expenseDate) expense.expenseDate = new Date(dto.expenseDate);
    if (dto.storeId !== undefined) expense.storeId = dto.storeId;
    if (dto.referenceNumber !== undefined) expense.referenceNumber = dto.referenceNumber;
    if (dto.notes !== undefined) expense.notes = dto.notes;
    return this.expenseRepo.save(expense);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const expense = await this.findOne(id, companyId);
    expense.deletedAt = new Date();
    await this.expenseRepo.save(expense);
  }

  async getSummaryByMonth(companyId: string, year: number): Promise<Array<{
    bulan: number;
    namaBulan: string;
    totalBiaya: number;
    perKategori: Record<string, number>;
  }>> {
    const MONTH_NAMES = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];

    const result = await this.expenseRepo.manager.query(`
      SELECT 
        MONTH(expense_date) as bulan,
        category,
        SUM(amount) as total
      FROM expenses
      WHERE company_id = ?
        AND YEAR(expense_date) = ?
        AND deleted_at IS NULL
      GROUP BY MONTH(expense_date), category
      ORDER BY bulan, category
    `, [companyId, year]);

    const monthMap = new Map<number, { totalBiaya: number; perKategori: Record<string, number> }>();

    for (let m = 1; m <= 12; m++) {
      monthMap.set(m, { totalBiaya: 0, perKategori: {} });
    }

    for (const row of result) {
      const month = monthMap.get(row.bulan)!;
      const amount = parseFloat(row.total);
      month.totalBiaya += amount;
      month.perKategori[row.category] = (month.perKategori[row.category] || 0) + amount;
    }

    return Array.from(monthMap.entries()).map(([bulan, data]) => ({
      bulan,
      namaBulan: MONTH_NAMES[bulan - 1],
      totalBiaya: Math.round(data.totalBiaya),
      perKategori: data.perKategori,
    }));
  }
}
