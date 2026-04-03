import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { QUEUE_NAMES } from '../../../common/queue/queues.constants';
import { SendEmailDto } from '../dto';

@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  @Process('send-email')
  async handleSendEmail(job: Job<SendEmailDto>) {
    this.logger.log(`Processing email job ${job.id} for ${job.data.to}`);

    try {
      // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
      // For now, just log the email
      this.logger.log(`Email sent to ${job.data.to}: ${job.data.subject}`);

      // Simulate email sending delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return {
        success: true,
        messageId: `msg_${Date.now()}`,
        to: job.data.to,
        subject: job.data.subject,
      };
    } catch (error) {
      this.logger.error(`Failed to send email to ${job.data.to}`, error);
      throw error; // Bull will retry based on job configuration
    }
  }

  @Process('send-invoice-email')
  async handleSendInvoiceEmail(
    job: Job<{
      invoiceId: string;
      companyId: string;
      email: string;
      invoiceNumber: string;
      pdfPath: string;
    }>,
  ) {
    this.logger.log(
      `Processing invoice email job ${job.id} for ${job.data.email}`,
    );

    try {
      // TODO: Integrate with actual email service
      // For now, just log the email
      this.logger.log(
        `Invoice email sent to ${job.data.email}: Invoice ${job.data.invoiceNumber}`,
      );
      this.logger.log(`PDF attachment: ${job.data.pdfPath}`);

      // Simulate email sending delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return {
        success: true,
        messageId: `msg_${Date.now()}`,
        to: job.data.email,
        subject: `Invoice ${job.data.invoiceNumber}`,
        invoiceId: job.data.invoiceId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send invoice email to ${job.data.email}`,
        error,
      );
      throw error;
    }
  }
}
