import { Injectable } from '@nestjs/common';
import { PaymentMethodsService } from '../../modules/payment-methods/payment-methods.service';

@Injectable()
export class PaymentMethodsSeeder {
  constructor(
    private readonly paymentMethodsService: PaymentMethodsService,
  ) {}

  /**
   * Seed default payment methods for a company
   * Called when company is activated after payment
   */
  async seedForCompany(companyId: string): Promise<void> {
    console.log(`🌱 Seeding payment methods for company: ${companyId}`);
    await this.paymentMethodsService.seedDefaultPaymentMethods(companyId);
    console.log(`✅ Payment methods seeding completed for company: ${companyId}`);
  }
}
