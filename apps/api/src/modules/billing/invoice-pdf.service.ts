import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Invoice } from './invoice.entity';
import { Company } from '../companies/company.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class InvoicePdfService {
  private readonly uploadsDir = path.join(process.cwd(), 'uploads', 'invoices');

  constructor() {
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async generateInvoicePdf(
    invoice: Invoice,
    company: Company,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const fileName = `${invoice.invoiceNumber}.pdf`;
        const filePath = path.join(this.uploadsDir, fileName);

        // Create PDF document
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        // Header
        this.generateHeader(doc, company);
        this.generateInvoiceInfo(doc, invoice);

        // Line items table
        this.generateLineItemsTable(doc, invoice);

        // Summary
        this.generateSummary(doc, invoice);

        // Footer
        this.generateFooter(doc);

        doc.end();

        stream.on('finish', () => {
          // Return relative path for storage
          resolve(`/uploads/invoices/${fileName}`);
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  private generateHeader(doc: PDFKit.PDFDocument, company: Company) {
    doc
      .fontSize(20)
      .text('INVOICE', 50, 50, { align: 'right' })
      .fontSize(10)
      .text(company.name, 50, 50)
      .text(company.address || '', 50, 65)
      .text(`Email: ${company.email}`, 50, 80)
      .text(`Phone: ${company.phone || ''}`, 50, 95)
      .moveDown();
  }

  private generateInvoiceInfo(doc: PDFKit.PDFDocument, invoice: Invoice) {
    const infoTop = 130;

    doc
      .fontSize(10)
      .text(`Invoice Number: ${invoice.invoiceNumber}`, 50, infoTop)
      .text(
        `Issue Date: ${this.formatDate(invoice.issueDate)}`,
        50,
        infoTop + 15,
      )
      .text(`Due Date: ${this.formatDate(invoice.dueDate)}`, 50, infoTop + 30)
      .text(`Status: ${invoice.status.toUpperCase()}`, 50, infoTop + 45)
      .moveDown();
  }

  private generateLineItemsTable(doc: PDFKit.PDFDocument, invoice: Invoice) {
    const tableTop = 230;
    const itemCodeX = 50;
    const descriptionX = 150;
    const quantityX = 300;
    const priceX = 370;
    const amountX = 450;

    // Table header
    doc
      .fontSize(10)
      .text('Item', itemCodeX, tableTop)
      .text('Description', descriptionX, tableTop)
      .text('Qty', quantityX, tableTop)
      .text('Price', priceX, tableTop)
      .text('Amount', amountX, tableTop);

    // Draw line
    doc
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    // Line items
    let y = tableTop + 25;
    invoice.lineItems.forEach((item, index) => {
      doc
        .fontSize(9)
        .text(String(index + 1), itemCodeX, y)
        .text(item.description, descriptionX, y, { width: 140 })
        .text(item.quantity.toString(), quantityX, y)
        .text(this.formatCurrency(item.unitPrice), priceX, y)
        .text(this.formatCurrency(item.amount), amountX, y);

      y += 20;
    });

    return y;
  }

  private generateSummary(doc: PDFKit.PDFDocument, invoice: Invoice) {
    const summaryTop = 400;
    const labelX = 400;
    const valueX = 480;

    doc
      .fontSize(10)
      .text('Subtotal:', labelX, summaryTop)
      .text(this.formatCurrency(invoice.subtotal), valueX, summaryTop, {
        align: 'right',
      });

    if (invoice.discountAmount > 0) {
      doc
        .text('Discount:', labelX, summaryTop + 20)
        .text(
          `-${this.formatCurrency(invoice.discountAmount)}`,
          valueX,
          summaryTop + 20,
          { align: 'right' },
        );
    }

    if (invoice.taxAmount > 0) {
      doc
        .text(`Tax (${invoice.taxRate}%):`, labelX, summaryTop + 40)
        .text(this.formatCurrency(invoice.taxAmount), valueX, summaryTop + 40, {
          align: 'right',
        });
    }

    // Draw line
    doc
      .moveTo(400, summaryTop + 60)
      .lineTo(550, summaryTop + 60)
      .stroke();

    // Total
    doc
      .fontSize(12)
      .text('Total:', labelX, summaryTop + 70)
      .text(this.formatCurrency(invoice.total), valueX, summaryTop + 70, {
        align: 'right',
      });
  }

  private generateFooter(doc: PDFKit.PDFDocument) {
    doc
      .fontSize(8)
      .text('Thank you for your business!', 50, 700, {
        align: 'center',
        width: 500,
      })
      .text(
        'This is a computer-generated invoice and does not require a signature.',
        50,
        715,
        { align: 'center', width: 500 },
      );
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Number(amount));
  }
}
