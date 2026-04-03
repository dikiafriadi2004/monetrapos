import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  // UseGuards,
  Request,
} from '@nestjs/common';
import { CustomerLoyaltyService, LoyaltyTier } from './customer-loyalty.service';
// TODO: Import actual guards when auth module is updated
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('customers/loyalty')
// @UseGuards(JwtAuthGuard)
export class CustomerLoyaltyController {
  constructor(
    private readonly customerLoyaltyService: CustomerLoyaltyService,
  ) {}

  /**
   * Get all tier benefits
   */
  @Get('tiers')
  getTierBenefits() {
    return {
      tiers: this.customerLoyaltyService.getAllTierBenefits(),
    };
  }

  /**
   * Get tier statistics for company
   */
  @Get('statistics')
  async getTierStatistics(@Request() req) {
    return await this.customerLoyaltyService.getTierStatistics(
      req.user.company_id,
    );
  }

  /**
   * Manually trigger tier upgrade for a customer
   */
  @Post(':customerId/upgrade-tier')
  async upgradeTier(@Request() req, @Param('customerId') customerId: string) {
    return await this.customerLoyaltyService.updateCustomerTier(customerId);
  }

  /**
   * Get upcoming birthdays
   */
  @Get('birthdays/upcoming')
  async getUpcomingBirthdays(
    @Request() req,
    @Query('days') days?: string,
  ) {
    const daysAhead = days ? parseInt(days, 10) : 7;
    const customers = await this.customerLoyaltyService.getUpcomingBirthdays(
      req.user.company_id,
      daysAhead,
    );

    return {
      count: customers.length,
      daysAhead,
      customers: customers.map((c) => ({
        id: c.id,
        customerNumber: c.customerNumber,
        name: c.name,
        email: c.email,
        phone: c.phone,
        dateOfBirth: c.dateOfBirth,
        loyaltyTier: c.loyaltyTier,
        loyaltyPoints: c.loyaltyPoints,
      })),
    };
  }

  /**
   * Get upcoming anniversaries
   */
  @Get('anniversaries/upcoming')
  async getUpcomingAnniversaries(
    @Request() req,
    @Query('days') days?: string,
  ) {
    const daysAhead = days ? parseInt(days, 10) : 7;
    const customers = await this.customerLoyaltyService.getUpcomingAnniversaries(
      req.user.company_id,
      daysAhead,
    );

    return {
      count: customers.length,
      daysAhead,
      customers: customers.map((c) => {
        const firstPurchase = new Date(c.firstPurchaseAt);
        const today = new Date();
        const yearsSince = today.getFullYear() - firstPurchase.getFullYear();

        return {
          id: c.id,
          customerNumber: c.customerNumber,
          name: c.name,
          email: c.email,
          phone: c.phone,
          firstPurchaseAt: c.firstPurchaseAt,
          yearsSince,
          loyaltyTier: c.loyaltyTier,
          loyaltyPoints: c.loyaltyPoints,
        };
      }),
    };
  }

  /**
   * Get birthdays in date range
   */
  @Get('birthdays')
  async getBirthdaysInRange(
    @Request() req,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const customers = await this.customerLoyaltyService.getCustomersWithBirthdays(
      req.user.company_id,
      start,
      end,
    );

    return {
      count: customers.length,
      startDate: start,
      endDate: end,
      customers: customers.map((c) => ({
        id: c.id,
        customerNumber: c.customerNumber,
        name: c.name,
        email: c.email,
        phone: c.phone,
        dateOfBirth: c.dateOfBirth,
        loyaltyTier: c.loyaltyTier,
      })),
    };
  }

  /**
   * Get anniversaries in date range
   */
  @Get('anniversaries')
  async getAnniversariesInRange(
    @Request() req,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const customers = await this.customerLoyaltyService.getCustomersWithAnniversaries(
      req.user.company_id,
      start,
      end,
    );

    return {
      count: customers.length,
      startDate: start,
      endDate: end,
      customers: customers.map((c) => {
        const firstPurchase = new Date(c.firstPurchaseAt);
        const today = new Date();
        const yearsSince = today.getFullYear() - firstPurchase.getFullYear();

        return {
          id: c.id,
          customerNumber: c.customerNumber,
          name: c.name,
          email: c.email,
          phone: c.phone,
          firstPurchaseAt: c.firstPurchaseAt,
          yearsSince,
          loyaltyTier: c.loyaltyTier,
        };
      }),
    };
  }
}
