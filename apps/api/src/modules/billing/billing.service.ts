import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from './invoice.entity';
import {
  PaymentTransaction,
  PaymentTransactionStatus,
  PaymentGateway,
} from './payment-transaction.entity';
import { InvoicePdfService } from './invoice-pdf.service';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { Subscription } from '../subscriptions/subscription.entity';
import { Company } from '../companies/company.entity';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly invoicePdfService: InvoicePdfService,
    @InjectQueue('notifications')
    private readonly notificationsQueue: Queue,
  ) {}

  // ============================================
  // INVOICE METHODS
  // ============================================

  async createInvoice(data: {
    companyId: string;
    subscriptionId?: string;
    addOnId?: string;
    companyAddOnId?: string;
    subtotal: number;
    taxRate?: number;
    taxAmount?: number;
    discountAmount?: number;
    total: number;
    dueDate: Date;
    lineItems?: any[];
  }): Promise<Invoice> {
    const invoiceNumber = await this.generateInvoiceNumber();

    const invoice = this.invoiceRepository.create({
      ...data,
      invoiceNumber,
      status: InvoiceStatus.PENDING,
      issueDate: new Date(),
      taxRate: data.taxRate || 0,
      taxAmount: data.taxAmount || 0,
      discountAmount: data.discountAmount || 0,
      lineItems: data.lineItems || [],
    });

    return this.invoiceRepository.save(invoice);
  }

  /**
   * Create invoice for add-on purchase
   */
  async createAddOnInvoice(
    companyId: string,
    addOn: any,
    companyAddOnId: string,
  ): Promise<Invoice> {
    const subtotal = Number(addOn.price);
    const taxRate = 11; // PPN 11%
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // 7 days to pay

    return this.createInvoice({
      companyId,
      addOnId: addOn.id,
      companyAddOnId,
      subtotal,
      taxRate,
      taxAmount,
      total,
      dueDate,
      lineItems: [
        {
          description: `Add-on: ${addOn.name}`,
          quantity: 1,
          unitPrice: subtotal,
          amount: subtotal,
        },
      ],
    });
  }

  async findInvoicesByCompany(companyId: string): Promise<Invoice[]> {
    return this.invoiceRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAllInvoices(): Promise<Invoice[]> {
    return this.invoiceRepository.find({
      relations: ['company'],
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async findInvoice(id: string, companyId: string | null): Promise<Invoice> {
    const where: any = { id };
    if (companyId) {
      where.companyId = companyId;
    }

    const invoice = await this.invoiceRepository.findOne({ where });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async updateInvoicePaymentUrl(id: string, paymentUrl: string): Promise<void> {
    await this.invoiceRepository.update(id, { paymentUrl } as any);
  }

  async updateInvoiceStatus(
    id: string,
    status: InvoiceStatus,
    paymentData?: {
      paymentMethod?: string;
      paymentReference?: string;
    },
  ): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({ where: { id } });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    invoice.status = status;

    if (status === InvoiceStatus.PAID) {
      invoice.paidAt = new Date();
      if (paymentData) {
        if (paymentData.paymentMethod) {
          invoice.paymentMethod = paymentData.paymentMethod;
        }
        if (paymentData.paymentReference) {
          invoice.paymentReference = paymentData.paymentReference;
        }
      }
    }

    return this.invoiceRepository.save(invoice);
  }

  async generateInvoiceNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    // Get count of invoices this month
    const count = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.invoice_number LIKE :pattern', {
        pattern: `INV-${year}${month}-%`,
      })
      .getCount();

    const sequence = String(count + 1).padStart(5, '0');
    return `INV-${year}${month}-${sequence}`;
  }

  // ============================================
  // PAYMENT TRANSACTION METHODS
  // ============================================

  async createPaymentTransaction(data: {
    invoiceId: string;
    companyId: string;
    gateway: PaymentGateway;
    amount: number;
    currency?: string;
  }): Promise<PaymentTransaction> {
    const transaction = this.paymentTransactionRepository.create({
      ...data,
      status: PaymentTransactionStatus.PENDING,
      currency: data.currency || 'IDR',
    });

    return this.paymentTransactionRepository.save(transaction);
  }

  async updatePaymentTransaction(
    id: string,
    data: {
      status: PaymentTransactionStatus;
      gatewayTransactionId?: string;
      paymentMethod?: string;
      paymentChannel?: string;
      gatewayResponse?: any;
    },
  ): Promise<PaymentTransaction> {
    const transaction = await this.paymentTransactionRepository.findOne({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    Object.assign(transaction, data);

    if (data.status === PaymentTransactionStatus.SUCCESS) {
      transaction.completedAt = new Date();
    }

    return this.paymentTransactionRepository.save(transaction);
  }

  async findPaymentTransactionsByInvoice(
    invoiceId: string,
  ): Promise<PaymentTransaction[]> {
    return this.paymentTransactionRepository.find({
      where: { invoiceId },
      order: { createdAt: 'DESC' },
    });
  }

  async findPaymentTransactionsByInvoiceNumber(
    invoiceNumber: string,
  ): Promise<PaymentTransaction[]> {
    // Find invoice by invoice number first
    const invoice = await this.invoiceRepository.findOne({
      where: { invoiceNumber },
    });

    if (!invoice) {
      return [];
    }

    // Then find transactions by invoice ID
    return this.findPaymentTransactionsByInvoice(invoice.id);
  }

  async findPaymentTransactionByGatewayId(
    gatewayTransactionId: string,
  ): Promise<PaymentTransaction | null> {
    return this.paymentTransactionRepository.findOne({
      where: { gatewayTransactionId },
    });
  }

  // ============================================
  // WEBHOOK HANDLING
  // ============================================

  async handlePaymentWebhook(data: {
    gateway: PaymentGateway;
    gatewayTransactionId: string;
    status: PaymentTransactionStatus;
    paymentMethod?: string;
    paymentChannel?: string;
    gatewayResponse: any;
  }): Promise<void> {
    // Find payment transaction
    const transaction = await this.findPaymentTransactionByGatewayId(
      data.gatewayTransactionId,
    );

    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    // Update transaction status
    await this.updatePaymentTransaction(transaction.id, {
      status: data.status,
      paymentMethod: data.paymentMethod,
      paymentChannel: data.paymentChannel,
      gatewayResponse: data.gatewayResponse,
    });

    // If payment successful, update invoice
    if (data.status === PaymentTransactionStatus.SUCCESS) {
      await this.updateInvoiceStatus(
        transaction.invoiceId,
        InvoiceStatus.PAID,
        {
          paymentMethod: data.paymentMethod,
          paymentReference: data.gatewayTransactionId,
        },
      );

      // Generate invoice PDF
      const invoice = await this.invoiceRepository.findOne({
        where: { id: transaction.invoiceId },
        relations: ['company'],
      });

      if (invoice) {
        await this.generateAndSaveInvoicePdf(invoice);

        // Activate or extend subscription linked to this invoice
        if (invoice.subscriptionId) {
          await this.activateSubscriptionAfterPayment(
            invoice.subscriptionId,
            invoice.companyId,
          );
        }
      }
    }
  }

  // ============================================
  // PDF GENERATION
  // ============================================

  async generateAndSaveInvoicePdf(invoice: Invoice): Promise<string> {
    // Ensure company relation is loaded
    if (!invoice.company) {
      const fullInvoice = await this.invoiceRepository.findOne({
        where: { id: invoice.id },
        relations: ['company'],
      });
      if (!fullInvoice) {
        throw new NotFoundException('Invoice not found');
      }
      invoice = fullInvoice;
    }

    // Generate PDF
    const pdfPath = await this.invoicePdfService.generateInvoicePdf(
      invoice,
      invoice.company,
    );

    // Update invoice with PDF URL
    invoice.invoicePdfUrl = pdfPath;
    await this.invoiceRepository.save(invoice);

    // Queue email notification
    await this.notificationsQueue.add('send-invoice-email', {
      invoiceId: invoice.id,
      companyId: invoice.companyId,
      email: invoice.company.email,
      invoiceNumber: invoice.invoiceNumber,
      pdfPath,
    });

    return pdfPath;
  }

  // ============================================
  // SUBSCRIPTION ACTIVATION AFTER PAYMENT
  // ============================================

  /**
   * Activate or extend subscription after successful payment.
   * Called from handlePaymentWebhook when payment status = SUCCESS.
   */
  private async activateSubscriptionAfterPayment(
    subscriptionId: string,
    companyId: string,
  ): Promise<void> {
    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        this.logger.warn(`Subscription ${subscriptionId} not found for activation`);
        return;
      }

      const duration = subscription.durationMonths || 1;
      const now = new Date();

      const baseDate =
        subscription.status === 'active' && subscription.endDate && subscription.endDate > now
          ? new Date(subscription.endDate)
          : now;

      const newEndDate = new Date(baseDate);
      newEndDate.setMonth(newEndDate.getMonth() + duration);

      await this.subscriptionRepository.update(subscriptionId, {
        status: 'active' as any,
        startDate: subscription.status !== 'active' ? now : subscription.startDate,
        endDate: newEndDate,
        durationMonths: duration,
        gracePeriodEndDate: null as any,
        cancelAtPeriodEnd: false,
      });

      await this.companyRepository.update(companyId, {
        status: 'active',
        subscriptionStatus: 'active',
        subscriptionEndsAt: newEndDate,
      });

      this.logger.log(
        `Subscription ${subscriptionId} activated/extended until ${newEndDate.toISOString()}`,
      );
    } catch (err) {
      this.logger.error(`Failed to activate subscription ${subscriptionId}: ${err.message}`);
    }
  }
}
