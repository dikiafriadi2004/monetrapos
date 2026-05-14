import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { Coupon, CouponDiscountType } from './coupon.entity';
import { WebhookLog } from './webhook-log.entity';
import { EmailTemplate } from '../email/email-template.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';

@ApiTags('Admin - Billing')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin')
export class AdminBillingController {
  constructor(
    @InjectRepository(Coupon) private couponRepo: Repository<Coupon>,
    @InjectRepository(WebhookLog) private webhookRepo: Repository<WebhookLog>,
    @InjectRepository(EmailTemplate) private emailTemplateRepo: Repository<EmailTemplate>,
  ) {}

  // ─── Coupons ─────────────────────────────────────────────────────────────────

  @Get('coupons')
  async getCoupons() {
    return this.couponRepo.find({ order: { createdAt: 'DESC' } });
  }

  @Post('coupons')
  @HttpCode(HttpStatus.CREATED)
  async createCoupon(@Body() dto: {
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    maxUses?: number | null;
    expiresAt?: string | null;
    description?: string;
    isActive?: boolean;
  }) {
    const existing = await this.couponRepo.findOne({ where: { code: dto.code.toUpperCase() } });
    if (existing) throw new BadRequestException('Kode kupon sudah digunakan');

    const coupon = this.couponRepo.create({
      id: crypto.randomUUID(),
      code: dto.code.toUpperCase(),
      discountType: dto.discountType as CouponDiscountType,
      discountValue: dto.discountValue,
      maxUses: dto.maxUses || null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      description: dto.description || null,
      isActive: dto.isActive !== false,
    });
    return this.couponRepo.save(coupon);
  }

  @Patch('coupons/:id')
  async updateCoupon(@Param('id') id: string, @Body() dto: Partial<{
    isActive: boolean; maxUses: number | null; expiresAt: string | null; description: string;
  }>) {
    const coupon = await this.couponRepo.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    if (dto.isActive !== undefined) coupon.isActive = dto.isActive;
    if (dto.maxUses !== undefined) coupon.maxUses = dto.maxUses;
    if (dto.expiresAt !== undefined) coupon.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (dto.description !== undefined) coupon.description = dto.description;
    return this.couponRepo.save(coupon);
  }

  @Delete('coupons/:id')
  async deleteCoupon(@Param('id') id: string) {
    const coupon = await this.couponRepo.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    await this.couponRepo.remove(coupon);
    return { message: 'Coupon deleted' };
  }

  // ─── Webhook Logs ─────────────────────────────────────────────────────────────

  @Get('webhook-logs')
  async getWebhookLogs(
    @Query('status') status?: string,
    @Query('limit') limit?: number,
  ) {
    const query = this.webhookRepo.createQueryBuilder('log')
      .orderBy('log.created_at', 'DESC')
      .take(limit ? Number(limit) : 100);
    if (status) query.where('log.status = :status', { status });
    return query.getMany();
  }

  // ─── Email Templates ──────────────────────────────────────────────────────────

  @Get('email-templates')
  async getEmailTemplates() {
    return this.emailTemplateRepo.find({ order: { type: 'ASC' } });
  }

  @Patch('email-templates/:id')
  async updateEmailTemplate(@Param('id') id: string, @Body() dto: { subject?: string; body?: string; isActive?: boolean }) {
    const template = await this.emailTemplateRepo.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    if (dto.subject) template.subject = dto.subject;
    if (dto.body) template.body = dto.body;
    if (dto.isActive !== undefined) template.isActive = dto.isActive;
    return this.emailTemplateRepo.save(template);
  }
}
