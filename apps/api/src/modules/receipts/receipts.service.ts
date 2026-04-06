import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { Store } from '../stores/store.entity';
import { EmailService } from '../email/email.service';
import {
  GenerateReceiptDto,
  EmailReceiptDto,
  PrintReceiptDto,
  ReceiptFormat,
} from './dto';

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    private readonly emailService: EmailService,
  ) {}

  async generateReceipt(dto: GenerateReceiptDto): Promise<any> {
    const transaction = await this.transactionRepo.findOne({
      where: { id: dto.transactionId },
      relations: ['items', 'employee'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const store = await this.storeRepo.findOne({
      where: { id: transaction.storeId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const receiptData = this.buildReceiptData(transaction, store);

    if (dto.format === ReceiptFormat.THERMAL) {
      return this.generateThermalReceipt(receiptData);
    } else if (dto.format === ReceiptFormat.A4) {
      return this.generateA4Receipt(receiptData);
    } else if (dto.format === ReceiptFormat.EMAIL) {
      if (!dto.email) {
        throw new Error('Email is required for email format');
      }
      return this.sendEmailReceipt(receiptData, dto.email);
    }
  }

  async emailReceipt(dto: EmailReceiptDto): Promise<any> {
    const transaction = await this.transactionRepo.findOne({
      where: { id: dto.transactionId },
      relations: ['items', 'employee'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const store = await this.storeRepo.findOne({
      where: { id: transaction.storeId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const receiptData = this.buildReceiptData(transaction, store);
    const htmlReceipt = this.generateA4Receipt(receiptData);

    const result = await this.emailService.sendMail({
      to: dto.email,
      subject: `Struk Transaksi ${transaction.invoiceNumber} - ${store.name}`,
      html: htmlReceipt,
    });

    if (!result.success) {
      this.logger.warn(`Failed to send receipt email to ${dto.email}: ${result.error}`);
    } else {
      this.logger.log(`Receipt email sent to ${dto.email} for transaction ${transaction.invoiceNumber}`);
    }

    return {
      success: result.success,
      message: result.success ? `Struk berhasil dikirim ke ${dto.email}` : `Gagal mengirim email: ${result.error || 'Email belum dikonfigurasi'}`,
      transactionId: dto.transactionId,
    };
  }

  async printReceipt(dto: PrintReceiptDto): Promise<any> {
    const transaction = await this.transactionRepo.findOne({
      where: { id: dto.transactionId },
      relations: ['items', 'employee'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const store = await this.storeRepo.findOne({
      where: { id: transaction.storeId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const receiptData = this.buildReceiptData(transaction, store);
    const thermalReceipt = this.generateThermalReceipt(receiptData);

    // Return receipt data for client-side printing (ESC/POS or browser print)
    this.logger.log(`Print receipt requested for transaction ${transaction.invoiceNumber}, printer: ${dto.printerName || 'default'}`);

    return {
      success: true,
      message: `Struk siap dicetak${dto.printerName ? ` ke printer ${dto.printerName}` : ''}`,
      copies: dto.copies || 1,
      transactionId: dto.transactionId,
      receiptText: thermalReceipt,
      receiptHtml: this.generateA4Receipt(receiptData),
    };
  }

  private buildReceiptData(transaction: Transaction, store: Store): any {
    // Resolve employee name: from relation, or from metadata (stored at checkout time)
    const employeeName =
      transaction.employee?.name ||
      transaction.metadata?.employeeName ||
      null;

    // Build full logo URL if available
    const apiBase = process.env.APP_URL || 'http://localhost:4404';
    const logoUrl = store.receiptLogoUrl
      ? (store.receiptLogoUrl.startsWith('http') ? store.receiptLogoUrl : `${apiBase}${store.receiptLogoUrl}`)
      : null;

    return {
      store: {
        name: store.name || '',
        address: store.address || null,
        phone: store.phone || null,
        logoUrl,
        headerText: store.receiptHeader || null,
        footerText: store.receiptFooter || null,
      },
      transaction: {
        invoiceNumber: transaction.invoiceNumber,
        date: transaction.createdAt,
        customerName: transaction.customerName || null,
        employeeName,
        paymentMethod: transaction.paymentMethod,
      },
      items: transaction.items.map((item) => ({
        name: item.productName,
        quantity: item.quantity,
        price: item.unitPrice ?? (item.subtotal / item.quantity),
        subtotal: item.subtotal,
      })),
      summary: {
        subtotal: transaction.subtotal,
        taxAmount: transaction.taxAmount,
        discountAmount: transaction.discountAmount,
        total: transaction.total,
        paidAmount: transaction.paidAmount,
        changeAmount: transaction.changeAmount,
      },
    };
  }

  private generateThermalReceipt(data: any): string {
    let receipt = '';
    receipt += this.centerText(data.store.name, 32) + '\n';
    if (data.store.address) receipt += this.centerText(data.store.address, 32) + '\n';
    if (data.store.phone) receipt += this.centerText(data.store.phone, 32) + '\n';
    receipt += this.line(32) + '\n';
    receipt += `Invoice: ${data.transaction.invoiceNumber}\n`;
    receipt += `Date: ${new Date(data.transaction.date).toLocaleString('id-ID')}\n`;
    if (data.transaction.employeeName) receipt += `Cashier: ${data.transaction.employeeName}\n`;
    if (data.transaction.customerName) {
      receipt += `Customer: ${data.transaction.customerName}\n`;
    }
    receipt += this.line(32) + '\n';

    data.items.forEach((item: any) => {
      receipt += `${item.name}\n`;
      receipt += `  ${item.quantity} x ${this.formatCurrency(item.price)} = ${this.formatCurrency(item.subtotal)}\n`;
    });

    receipt += this.line(32) + '\n';
    receipt +=
      this.rightAlign(
        `Subtotal: ${this.formatCurrency(data.summary.subtotal)}`,
        32,
      ) + '\n';
    if (data.summary.discountAmount > 0) {
      receipt +=
        this.rightAlign(
          `Discount: ${this.formatCurrency(data.summary.discountAmount)}`,
          32,
        ) + '\n';
    }
    if (data.summary.taxAmount > 0) {
      receipt +=
        this.rightAlign(
          `Tax: ${this.formatCurrency(data.summary.taxAmount)}`,
          32,
        ) + '\n';
    }
    receipt += this.line(32) + '\n';
    receipt +=
      this.rightAlign(`TOTAL: ${this.formatCurrency(data.summary.total)}`, 32) +
      '\n';
    receipt +=
      this.rightAlign(
        `Paid: ${this.formatCurrency(data.summary.paidAmount)}`,
        32,
      ) + '\n';
    receipt +=
      this.rightAlign(
        `Change: ${this.formatCurrency(data.summary.changeAmount)}`,
        32,
      ) + '\n';
    receipt += this.line(32) + '\n';
    receipt += this.centerText('Thank You!', 32) + '\n';
    receipt += this.centerText('Please Come Again', 32) + '\n';

    return receipt;
  }

  private generateA4Receipt(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 20px; }
          .header img { max-height: 80px; max-width: 200px; object-fit: contain; margin-bottom: 8px; }
          .header h2 { margin: 0 0 4px; }
          .header p { margin: 2px 0; color: #555; font-size: 14px; }
          .header-text { font-size: 13px; color: #666; margin-bottom: 8px; white-space: pre-line; }
          .info { margin-bottom: 20px; }
          .info p { margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          .total { font-weight: bold; font-size: 18px; }
          .footer { text-align: center; margin-top: 30px; color: #555; white-space: pre-line; }
        </style>
      </head>
      <body>
        <div class="header">
          ${data.store.logoUrl ? `<img src="${data.store.logoUrl}" alt="Logo" />` : ''}
          ${data.store.headerText ? `<div class="header-text">${data.store.headerText}</div>` : ''}
          <h2>${data.store.name}</h2>
          ${data.store.address ? `<p>${data.store.address}</p>` : ''}
          ${data.store.phone ? `<p>${data.store.phone}</p>` : ''}
        </div>
        <div class="info">
          <p><strong>Invoice:</strong> ${data.transaction.invoiceNumber}</p>
          <p><strong>Date:</strong> ${new Date(data.transaction.date).toLocaleString('id-ID')}</p>
          ${data.transaction.employeeName ? `<p><strong>Cashier:</strong> ${data.transaction.employeeName}</p>` : ''}
          ${data.transaction.customerName ? `<p><strong>Customer:</strong> ${data.transaction.customerName}</p>` : ''}
        </div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map((item: any) => `
              <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${this.formatCurrency(item.price)}</td>
                <td>${this.formatCurrency(item.subtotal)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top: 20px; text-align: right;">
          <p>Subtotal: ${this.formatCurrency(data.summary.subtotal)}</p>
          ${data.summary.discountAmount > 0 ? `<p>Discount: -${this.formatCurrency(data.summary.discountAmount)}</p>` : ''}
          ${data.summary.taxAmount > 0 ? `<p>Tax: ${this.formatCurrency(data.summary.taxAmount)}</p>` : ''}
          <p class="total">TOTAL: ${this.formatCurrency(data.summary.total)}</p>
          <p>Paid: ${this.formatCurrency(data.summary.paidAmount)}</p>
          <p>Change: ${this.formatCurrency(data.summary.changeAmount)}</p>
        </div>
        <div class="footer">
          ${data.store.footerText ? data.store.footerText : '<p>Thank You!</p><p>Please Come Again</p>'}
        </div>
      </body>
      </html>
    `;
  }

  private async sendEmailReceipt(data: any, email: string): Promise<any> {
    const htmlReceipt = this.generateA4Receipt(data);
    const result = await this.emailService.sendMail({
      to: email,
      subject: `Struk Transaksi ${data.transaction.invoiceNumber}`,
      html: htmlReceipt,
    });
    return {
      success: result.success,
      message: result.success ? `Struk dikirim ke ${email}` : `Gagal: ${result.error}`,
      data,
    };
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  private centerText(text: string, width: number): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  private rightAlign(text: string, width: number): string {
    const padding = Math.max(0, width - text.length);
    return ' '.repeat(padding) + text;
  }

  private line(width: number): string {
    return '-'.repeat(width);
  }
}
