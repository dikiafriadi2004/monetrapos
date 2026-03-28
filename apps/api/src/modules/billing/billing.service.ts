import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from './invoice.entity';
import { PaymentTransaction, PaymentTransactionStatus, PaymentGateway } from './payment-transaction.entity';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepository: Repository<PaymentTransaction>,
  ) {}

  // ============================================
  // INVOICE METHODS
  // ============================================

  async createInvoice(data: {
    companyId: string;
    subscriptionId?: string;
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

  async findInvoicesByCompany(companyId: string): Promise<Invoice[]> {
    return this.invoiceRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async findInvoice(id: string, companyId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id, companyId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
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
      await this.updateInvoiceStatus(transaction.invoiceId, InvoiceStatus.PAID, {
        paymentMethod: data.paymentMethod,
        paymentReference: data.gatewayTransactionId,
      });

      // TODO: Send payment confirmation email
      // TODO: Activate/extend subscription
    }
  }
}
