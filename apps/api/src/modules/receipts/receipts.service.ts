import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { Store } from '../stores/store.entity';
import { GenerateReceiptDto, EmailReceiptDto, PrintReceiptDto, ReceiptFormat } from './dto';

@Injectable()
export class ReceiptsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
  ) {}

  async generateReceipt(dto: GenerateReceiptDto): Promise<any> {
    const transaction = await this.transactionRepo.findOne({
      where: { id: dto.transactionId },
      relations: ['items'],
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
      relations: ['items'],
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
    
    // TODO: Integrate with email service (SendGrid/AWS SES)
    return {
      success: true,
      message: `Receipt sent to ${dto.email}`,
      transactionId: dto.transactionId,
    };
  }

  async printReceipt(dto: PrintReceiptDto): Promise<any> {
    const transaction = await this.transactionRepo.findOne({
      where: { id: dto.transactionId },
      relations: ['items'],
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

    // TODO: Integrate with printer service
    return {
      success: true,
      message: `Receipt sent to printer ${dto.printerName}`,
      copies: dto.copies,
      transactionId: dto.transactionId,
    };
  }

  private buildReceiptData(transaction: Transaction, store: Store): any {
    return {
      store: {
        name: store.name,
        address: store.address,
        phone: store.phone,
      },
      transaction: {
        invoiceNumber: transaction.invoiceNumber,
        date: transaction.createdAt,
        customerName: transaction.customerName,
        employeeName: transaction.employee?.name || 'Unknown',
        paymentMethod: transaction.paymentMethod,
      },
      items: transaction.items.map((item) => ({
        name: item.productName,
        quantity: item.quantity,
        price: item.subtotal / item.quantity, // Calculate unit price from subtotal
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
    // Generate thermal receipt format (58mm or 80mm)
    let receipt = '';
    receipt += this.centerText(data.store.name, 32) + '\n';
    receipt += this.centerText(data.store.address, 32) + '\n';
    receipt += this.centerText(data.store.phone, 32) + '\n';
    receipt += this.line(32) + '\n';
    receipt += `Invoice: ${data.transaction.invoiceNumber}\n`;
    receipt += `Date: ${new Date(data.transaction.date).toLocaleString('id-ID')}\n`;
    receipt += `Cashier: ${data.transaction.employeeName}\n`;
    if (data.transaction.customerName) {
      receipt += `Customer: ${data.transaction.customerName}\n`;
    }
    receipt += this.line(32) + '\n';

    data.items.forEach((item: any) => {
      receipt += `${item.name}\n`;
      receipt += `  ${item.quantity} x ${this.formatCurrency(item.price)} = ${this.formatCurrency(item.subtotal)}\n`;
    });

    receipt += this.line(32) + '\n';
    receipt += this.rightAlign(`Subtotal: ${this.formatCurrency(data.summary.subtotal)}`, 32) + '\n';
    if (data.summary.discountAmount > 0) {
      receipt += this.rightAlign(`Discount: ${this.formatCurrency(data.summary.discountAmount)}`, 32) + '\n';
    }
    if (data.summary.taxAmount > 0) {
      receipt += this.rightAlign(`Tax: ${this.formatCurrency(data.summary.taxAmount)}`, 32) + '\n';
    }
    receipt += this.line(32) + '\n';
    receipt += this.rightAlign(`TOTAL: ${this.formatCurrency(data.summary.total)}`, 32) + '\n';
    receipt += this.rightAlign(`Paid: ${this.formatCurrency(data.summary.paidAmount)}`, 32) + '\n';
    receipt += this.rightAlign(`Change: ${this.formatCurrency(data.summary.changeAmount)}`, 32) + '\n';
    receipt += this.line(32) + '\n';
    receipt += this.centerText('Thank You!', 32) + '\n';
    receipt += this.centerText('Please Come Again', 32) + '\n';

    return receipt;
  }

  private generateA4Receipt(data: any): string {
    // Generate A4 receipt format (HTML for PDF conversion)
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .info { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          .total { font-weight: bold; font-size: 18px; }
          .footer { text-align: center; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${data.store.name}</h2>
          <p>${data.store.address}</p>
          <p>${data.store.phone}</p>
        </div>
        <div class="info">
          <p><strong>Invoice:</strong> ${data.transaction.invoiceNumber}</p>
          <p><strong>Date:</strong> ${new Date(data.transaction.date).toLocaleString('id-ID')}</p>
          <p><strong>Cashier:</strong> ${data.transaction.employeeName}</p>
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
          ${data.summary.discountAmount > 0 ? `<p>Discount: ${this.formatCurrency(data.summary.discountAmount)}</p>` : ''}
          ${data.summary.taxAmount > 0 ? `<p>Tax: ${this.formatCurrency(data.summary.taxAmount)}</p>` : ''}
          <p class="total">TOTAL: ${this.formatCurrency(data.summary.total)}</p>
          <p>Paid: ${this.formatCurrency(data.summary.paidAmount)}</p>
          <p>Change: ${this.formatCurrency(data.summary.changeAmount)}</p>
        </div>
        <div class="footer">
          <p>Thank You!</p>
          <p>Please Come Again</p>
        </div>
      </body>
      </html>
    `;
  }

  private async sendEmailReceipt(data: any, email: string): Promise<any> {
    // TODO: Integrate with email service
    return {
      success: true,
      message: `Receipt sent to ${email}`,
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
