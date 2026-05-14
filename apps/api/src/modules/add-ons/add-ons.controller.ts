import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MemberJwtGuard } from '../auth/guards/member-jwt.guard';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { AddOnsService } from './add-ons.service';
import { CompanyAddOnsService } from './company-add-ons.service';
import { CreateAddOnDto } from './dto/create-add-on.dto';
import { UpdateAddOnDto } from './dto/update-add-on.dto';
import { PurchaseAddOnDto } from './dto/purchase-add-on.dto';
import { AddOnStatus } from './add-on.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../subscriptions/subscription.entity';
import { SubscriptionPlan } from '../subscriptions/subscription-plan.entity';

/**
 * Mapping: plan slug → add-on slugs yang sudah INCLUDE di paket tersebut
 * Add-on yang sudah include TIDAK bisa dibeli lagi (sudah gratis dalam paket)
 */
const PLAN_INCLUDED_ADDONS: Record<string, string[]> = {
  starter: [
    // Starter: fitur dasar saja, tidak include add-on premium
  ],
  professional: [
    'advanced-reporting',      // advanced_reports: true
    'multi-location',          // multi_store: true
    'online-ordering',         // online_ordering: true
    'loyalty-program-advanced', // customer_loyalty: true (advanced)
  ],
  enterprise: [
    'advanced-reporting',
    'multi-location',
    'online-ordering',
    'loyalty-program-advanced',
    'delivery-integration',    // delivery_management: true
    'accounting-integration',  // custom_integrations: true
    'ecommerce-integration',   // custom_integrations: true
    'whatsapp-integration',    // custom_integrations: true
    'priority-support',        // priority_support: true
    'extra-products',          // unlimited products
    'extra-users',             // unlimited users
  ],
};

// ==================== Admin Controller ====================

@ApiTags('Admin - Add-ons')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/add-ons')
export class AdminAddOnsController {
  constructor(
    private readonly addOnsService: AddOnsService,
    private readonly companyAddOnsService: CompanyAddOnsService,
  ) {}

  @Get()
  async findAll() {
    return this.addOnsService.findAll({});
  }

  @Post()
  async create(@Body() dto: CreateAddOnDto) {
    return this.addOnsService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAddOnDto) {
    return this.addOnsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.addOnsService.remove(id);
    return { message: 'Add-on deleted successfully' };
  }

  /** Lihat semua pembelian add-on oleh member */
  @Get('purchases')
  async getAllPurchases(
    @Query('status') status?: string,
    @Query('add_on_id') addOnId?: string,
  ) {
    return this.companyAddOnsService.findAllPurchases({ status, addOnId });
  }

  /** Aktivasi manual add-on (misal setelah konfirmasi pembayaran manual) */
  @Post('purchases/:id/activate')
  async activatePurchase(@Param('id') id: string) {
    return this.companyAddOnsService.adminActivateAddOn(id);
  }
}

// ==================== Member Controller ====================

@ApiTags('Add-ons')
@ApiBearerAuth()
@UseGuards(MemberJwtGuard)
@Controller('add-ons')
export class AddOnsController {
  constructor(
    private readonly addOnsService: AddOnsService,
    private readonly companyAddOnsService: CompanyAddOnsService,
    @InjectRepository(Subscription) private subscriptionRepo: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan) private planRepo: Repository<SubscriptionPlan>,
  ) {}

  /**
   * Ambil slug plan aktif company via raw query
   */
  private async getActivePlanSlug(companyId: string): Promise<string | null> {
    try {
      const rows: any[] = await this.subscriptionRepo.manager.query(
        `SELECT sp.slug FROM subscriptions s
         JOIN subscription_plans sp ON s.plan_id = sp.id
         WHERE s.company_id = ? AND s.status = 'active'
         ORDER BY s.created_at DESC LIMIT 1`,
        [companyId],
      );
      return rows[0]?.slug || null;
    } catch {
      return null;
    }
  }

  /**
   * Get all available add-ons — dengan info includedInPlan
   */
  @Get()
  async findAll(@Query('category') category: string, @Request() req) {
    const addOns = await this.addOnsService.findAll({
      status: AddOnStatus.ACTIVE,
      category,
    });

    const planSlug = await this.getActivePlanSlug(req.user.companyId);
    const includedSlugs = planSlug ? (PLAN_INCLUDED_ADDONS[planSlug] || []) : [];

    return addOns.map(a => ({
      ...a,
      includedInPlan: includedSlugs.includes(a.slug),
      planSlug,
    }));
  }

  /**
   * Get company's purchased add-ons — MUST be before @Get(':id')
   */
  @Get('purchased/list')
  async getPurchasedAddOns(@Request() req) {
    const companyId = req.user.companyId;
    return await this.companyAddOnsService.findByCompany(companyId);
  }

  /**
   * Get company's active add-ons — MUST be before @Get(':id')
   */
  @Get('purchased/active')
  async getActiveAddOns(@Request() req) {
    const companyId = req.user.companyId;
    return await this.companyAddOnsService.findActiveByCompany(companyId);
  }

  /**
   * Check if company has specific add-on — MUST be before @Get(':id')
   */
  @Get('check/:slug')
  async checkAddOn(@Request() req, @Param('slug') slug: string) {
    const companyId = req.user.companyId;
    const hasAddOn = await this.companyAddOnsService.hasAddOn(companyId, slug);
    return { hasAddOn };
  }

  /**
   * Get add-on by ID — MUST be after specific routes
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.addOnsService.findOne(id);
  }

  /**
   * Purchase an add-on
   */
  @Post('purchase')
  async purchaseAddOn(@Request() req, @Body() purchaseDto: PurchaseAddOnDto) {
    const companyId = req.user.companyId;
    return await this.companyAddOnsService.purchaseAddOn(companyId, purchaseDto);
  }

  /**
   * Cancel add-on subscription
   */
  @Post(':id/cancel')
  async cancelAddOn(@Request() req, @Param('id') companyAddOnId: string) {
    const companyId = req.user.companyId;
    return await this.companyAddOnsService.cancelAddOn(companyId, companyAddOnId);
  }
}
