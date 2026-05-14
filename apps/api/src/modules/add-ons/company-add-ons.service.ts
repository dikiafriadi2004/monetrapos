import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyAddOn, CompanyAddOnStatus } from './company-add-on.entity';
import { AddOn, AddOnPricingType } from './add-on.entity';
import { AddOnsService } from './add-ons.service';
import { PurchaseAddOnDto } from './dto/purchase-add-on.dto';
import { UnifiedPaymentService } from '../payment-gateway/unified-payment.service';
import { BillingService } from '../billing/billing.service';
import { Company } from '../companies/company.entity';
import { Subscription } from '../subscriptions/subscription.entity';

/** Add-on yang sudah include di setiap plan — sinkron dengan add-ons.controller.ts */
const PLAN_INCLUDED_ADDONS: Record<string, string[]> = {
  starter: [],
  professional: [
    'advanced-reporting', 'multi-location', 'online-ordering', 'loyalty-program-advanced',
  ],
  enterprise: [
    'advanced-reporting', 'multi-location', 'online-ordering', 'loyalty-program-advanced',
    'delivery-integration', 'accounting-integration', 'ecommerce-integration',
    'whatsapp-integration', 'priority-support', 'extra-products', 'extra-users',
  ],
};

@Injectable()
export class CompanyAddOnsService {
  private readonly logger = new Logger(CompanyAddOnsService.name);

  constructor(
    @InjectRepository(CompanyAddOn)
    private companyAddOnsRepository: Repository<CompanyAddOn>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    private addOnsService: AddOnsService,
    private unifiedPaymentService: UnifiedPaymentService,
    private billingService: BillingService,
  ) {}

  /**
   * Purchase an add-on
   */
  async purchaseAddOn(
    companyId: string,
    purchaseDto: PurchaseAddOnDto,
  ): Promise<{ companyAddOn: CompanyAddOn; paymentUrl: string }> {
    this.logger.log(
      `Company ${companyId} purchasing add-on ${purchaseDto.add_on_id}`,
    );

    // Get add-on details
    const addOn = await this.addOnsService.findOne(purchaseDto.add_on_id);

    // Check if add-on is active
    if (addOn.status !== 'active') {
      throw new BadRequestException('This add-on is not available for purchase');
    }

    // Cek apakah add-on sudah include di plan aktif company (via raw query — lebih reliable)
    try {
      const planRows: any[] = await this.companyRepository.manager.query(
        `SELECT sp.slug as plan_slug, sp.name as plan_name
         FROM subscriptions s
         JOIN subscription_plans sp ON s.plan_id = sp.id
         WHERE s.company_id = ? AND s.status = 'active'
         ORDER BY s.created_at DESC LIMIT 1`,
        [companyId],
      );
      if (planRows.length > 0) {
        const planSlug = planRows[0].plan_slug;
        const planName = planRows[0].plan_name;
        const includedInPlan = PLAN_INCLUDED_ADDONS[planSlug] || [];
        if (includedInPlan.includes(addOn.slug)) {
          throw new BadRequestException(
            `Add-on "${addOn.name}" sudah termasuk dalam paket ${planName} Anda. Tidak perlu dibeli terpisah.`,
          );
        }
      }
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      this.logger.warn(`Plan check failed: ${e.message}`);
    }

    // Check if company already has this add-on active
    const existing = await this.companyAddOnsRepository.findOne({
      where: {
        company_id: companyId,
        add_on_id: addOn.id,
        status: CompanyAddOnStatus.ACTIVE,
      },
    });

    if (existing) {
      throw new BadRequestException('You already have this add-on active');
    }

    // Create company add-on record (pending payment)
    const companyAddOn = this.companyAddOnsRepository.create({
      company_id: companyId,
      add_on_id: addOn.id,
      status: CompanyAddOnStatus.PENDING_PAYMENT,
      purchase_price: addOn.price,
      configuration: purchaseDto.configuration || {},
      auto_renew: addOn.pricing_type === AddOnPricingType.RECURRING,
    });

    await this.companyAddOnsRepository.save(companyAddOn);

    // Create invoice
    const invoice = await this.billingService.createAddOnInvoice(
      companyId,
      addOn,
      companyAddOn.id,
    );

    // Update company add-on with invoice ID
    companyAddOn.invoice_id = invoice.id;
    await this.companyAddOnsRepository.save(companyAddOn);

    // Get company details for payment
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Create payment
    let paymentUrl = '';
    let paymentWarning: string | null = null;

    try {
      const payment = await this.unifiedPaymentService.createPayment({
        orderId: invoice.invoiceNumber,
        amount: Number(addOn.price),
        customerName: company.name,
        customerEmail: company.email,
        customerPhone: company.phone || undefined,
        description: `Add-on: ${addOn.name}`,
        itemDetails: [
          {
            id: addOn.id,
            name: addOn.name,
            price: Number(addOn.price),
            quantity: 1,
          },
        ],
      });
      paymentUrl = payment.redirectUrl;

      // Simpan paymentUrl ke invoice agar bisa diakses dari halaman Billing
      if (paymentUrl) {
        await this.billingService.updateInvoicePaymentUrl(invoice.id, paymentUrl);
        this.logger.log(`Payment URL saved for invoice ${invoice.invoiceNumber}`);
      }
    } catch (paymentErr: any) {
      this.logger.warn(`Payment URL generation failed for add-on: ${paymentErr.message}`);

      // Xendit gagal (misal 403 IP Allowlist) — record sudah dibuat dengan status pending_payment
      // Kembalikan data invoice agar frontend bisa arahkan ke halaman billing untuk bayar manual
      // JANGAN throw error — member harus tetap bisa melihat invoice-nya
      const rawMsg: string = paymentErr.message || '';
      if (rawMsg.includes('UNAUTHORIZED_SENDER_IP') || rawMsg.includes('IP Allowlist') || rawMsg.includes('403')) {
        paymentWarning = 'Link pembayaran otomatis tidak tersedia. Invoice sudah dibuat — silakan bayar melalui halaman Billing atau hubungi admin.';
      } else if (rawMsg.includes('INVALID_API_KEY') || rawMsg.includes('401')) {
        paymentWarning = 'Konfigurasi payment gateway bermasalah. Invoice sudah dibuat — silakan hubungi admin untuk aktivasi.';
      } else {
        paymentWarning = 'Gagal membuat link pembayaran otomatis. Invoice sudah dibuat — silakan coba bayar dari halaman Billing.';
      }

      this.logger.log(`Add-on ${addOn.name} pending_payment, invoice: ${invoice.invoiceNumber}`);
    }

    return {
      companyAddOn,
      paymentUrl,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        dueDate: invoice.dueDate,
      },
      paymentWarning,
    } as any;
  }

  /**
   * Activate add-on after successful payment
   */
  async activateAddOn(
    companyAddOnId: string,
    paymentTransactionId: string,
  ): Promise<CompanyAddOn> {
    this.logger.log(`Activating add-on: ${companyAddOnId}`);

    const companyAddOn = await this.companyAddOnsRepository.findOne({
      where: { id: companyAddOnId },
      relations: ['add_on'],
    });

    if (!companyAddOn) {
      throw new NotFoundException('Company add-on not found');
    }

    if (companyAddOn.status === CompanyAddOnStatus.ACTIVE) {
      this.logger.warn(`Add-on ${companyAddOnId} is already active`);
      return companyAddOn;
    }

    // Update status and dates
    companyAddOn.status = CompanyAddOnStatus.ACTIVE;
    companyAddOn.activated_at = new Date();
    companyAddOn.payment_transaction_id = paymentTransactionId;

    // Set expiry date for recurring add-ons (30 days from now)
    if (companyAddOn.add_on.pricing_type === AddOnPricingType.RECURRING) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      companyAddOn.expires_at = expiryDate;
    }

    return await this.companyAddOnsRepository.save(companyAddOn);
  }

  /**
   * Get all purchased add-ons for a company
   */
  async findByCompany(companyId: string): Promise<CompanyAddOn[]> {
    return await this.companyAddOnsRepository.find({
      where: { company_id: companyId },
      relations: ['add_on'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Get all purchases across all companies (admin only)
   */
  async findAllPurchases(filters?: {
    status?: string;
    addOnId?: string;
  }): Promise<CompanyAddOn[]> {
    const query = this.companyAddOnsRepository
      .createQueryBuilder('ca')
      .leftJoinAndSelect('ca.add_on', 'add_on')
      .leftJoinAndSelect('ca.company', 'company')
      .orderBy('ca.created_at', 'DESC');

    if (filters?.status) {
      query.andWhere('ca.status = :status', { status: filters.status });
    }
    if (filters?.addOnId) {
      query.andWhere('ca.add_on_id = :addOnId', { addOnId: filters.addOnId });
    }

    return await query.getMany();
  }

  /**
   * Admin: activate add-on manually
   */
  async adminActivateAddOn(companyAddOnId: string): Promise<CompanyAddOn> {
    const companyAddOn = await this.companyAddOnsRepository.findOne({
      where: { id: companyAddOnId },
      relations: ['add_on'],
    });
    if (!companyAddOn) throw new NotFoundException('Company add-on not found');

    companyAddOn.status = CompanyAddOnStatus.ACTIVE;
    companyAddOn.activated_at = new Date();

    if (companyAddOn.add_on.pricing_type === AddOnPricingType.RECURRING) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      companyAddOn.expires_at = expiryDate;
    }

    return await this.companyAddOnsRepository.save(companyAddOn);
  }

  /**
   * Get active add-ons for a company
   */
  async findActiveByCompany(companyId: string): Promise<CompanyAddOn[]> {
    return await this.companyAddOnsRepository.find({
      where: {
        company_id: companyId,
        status: CompanyAddOnStatus.ACTIVE,
      },
      relations: ['add_on'],
      order: { activated_at: 'DESC' },
    });
  }

  /**
   * Check if company has a specific add-on active
   */
  async hasAddOn(companyId: string, addOnSlug: string): Promise<boolean> {
    const addOn = await this.addOnsService.findBySlug(addOnSlug);

    const companyAddOn = await this.companyAddOnsRepository.findOne({
      where: {
        company_id: companyId,
        add_on_id: addOn.id,
        status: CompanyAddOnStatus.ACTIVE,
      },
    });

    return !!companyAddOn;
  }

  /**
   * Cancel add-on subscription
   */
  async cancelAddOn(companyId: string, companyAddOnId: string): Promise<CompanyAddOn> {
    this.logger.log(`Cancelling add-on: ${companyAddOnId}`);

    const companyAddOn = await this.companyAddOnsRepository.findOne({
      where: {
        id: companyAddOnId,
        company_id: companyId,
      },
      relations: ['add_on'],
    });

    if (!companyAddOn) {
      throw new NotFoundException('Company add-on not found');
    }

    if (companyAddOn.status === CompanyAddOnStatus.CANCELLED) {
      throw new BadRequestException('Add-on is already cancelled');
    }

    // For one-time add-ons, we can't cancel (already paid)
    if (companyAddOn.add_on.pricing_type === AddOnPricingType.ONE_TIME) {
      throw new BadRequestException('One-time add-ons cannot be cancelled');
    }

    // Cancel auto-renewal
    companyAddOn.auto_renew = false;
    companyAddOn.status = CompanyAddOnStatus.CANCELLED;
    companyAddOn.cancelled_at = new Date();

    return await this.companyAddOnsRepository.save(companyAddOn);
  }

  /**
   * Renew expired add-ons (called by cron job)
   */
  async renewExpiredAddOns(): Promise<void> {
    this.logger.log('Checking for expired add-ons to renew');

    const expiredAddOns = await this.companyAddOnsRepository
      .createQueryBuilder('ca')
      .leftJoinAndSelect('ca.add_on', 'add_on')
      .where('ca.status = :status', { status: CompanyAddOnStatus.ACTIVE })
      .andWhere('ca.expires_at <= :now', { now: new Date() })
      .andWhere('ca.auto_renew = :autoRenew', { autoRenew: true })
      .andWhere('add_on.pricing_type = :pricingType', {
        pricingType: AddOnPricingType.RECURRING,
      })
      .getMany();

    this.logger.log(`Found ${expiredAddOns.length} expired add-ons to renew`);

    for (const companyAddOn of expiredAddOns) {
      try {
        // Create renewal invoice and payment
        await this.purchaseAddOn(companyAddOn.company_id, {
          add_on_id: companyAddOn.add_on_id,
          configuration: companyAddOn.configuration,
        });
      } catch (error) {
        this.logger.error(
          `Failed to renew add-on ${companyAddOn.id}: ${error.message}`,
        );
      }
    }
  }
}
