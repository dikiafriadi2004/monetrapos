import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MemberJwtGuard } from '../auth/guards/member-jwt.guard';
import { CustomerLoyaltyService } from './customer-loyalty.service';

@Controller('customers/loyalty')
@UseGuards(MemberJwtGuard)
export class CustomerLoyaltyController {
  constructor(
    private readonly customerLoyaltyService: CustomerLoyaltyService,
  ) {}

  @Get('tiers')
  getTierBenefits() {
    return { tiers: this.customerLoyaltyService.getAllTierBenefits() };
  }

  @Get('statistics')
  async getTierStatistics(@Request() req) {
    return await this.customerLoyaltyService.getTierStatistics(req.user.companyId);
  }

  @Post(':customerId/upgrade-tier')
  async upgradeTier(@Request() req, @Param('customerId') customerId: string) {
    return await this.customerLoyaltyService.updateCustomerTier(customerId);
  }

  @Post('upgrade-all-tiers')
  async upgradeAllTiers(@Request() req) {
    await this.customerLoyaltyService.checkAndUpgradeAllTiers();
    return { message: 'All customer tiers have been updated' };
  }

  @Get('birthdays/upcoming')
  async getUpcomingBirthdays(@Request() req, @Query('days') days?: string) {
    const daysAhead = days ? parseInt(days, 10) : 7;
    const customers = await this.customerLoyaltyService.getUpcomingBirthdays(req.user.companyId, daysAhead);
    return {
      count: customers.length,
      daysAhead,
      customers: customers.map((c) => ({
        id: c.id, customerNumber: c.customerNumber, name: c.name,
        email: c.email, phone: c.phone, dateOfBirth: c.dateOfBirth,
        loyaltyTier: c.loyaltyTier, loyaltyPoints: c.loyaltyPoints,
      })),
    };
  }

  @Get('anniversaries/upcoming')
  async getUpcomingAnniversaries(@Request() req, @Query('days') days?: string) {
    const daysAhead = days ? parseInt(days, 10) : 7;
    const customers = await this.customerLoyaltyService.getUpcomingAnniversaries(req.user.companyId, daysAhead);
    return {
      count: customers.length,
      daysAhead,
      customers: customers.map((c) => {
        const yearsSince = new Date().getFullYear() - new Date(c.firstPurchaseAt).getFullYear();
        return {
          id: c.id, customerNumber: c.customerNumber, name: c.name,
          email: c.email, phone: c.phone, firstPurchaseAt: c.firstPurchaseAt,
          yearsSince, loyaltyTier: c.loyaltyTier, loyaltyPoints: c.loyaltyPoints,
        };
      }),
    };
  }

  @Get('birthdays')
  async getBirthdaysInRange(
    @Request() req,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const customers = await this.customerLoyaltyService.getCustomersWithBirthdays(req.user.companyId, start, end);
    return {
      count: customers.length, startDate: start, endDate: end,
      customers: customers.map((c) => ({
        id: c.id, customerNumber: c.customerNumber, name: c.name,
        email: c.email, phone: c.phone, dateOfBirth: c.dateOfBirth, loyaltyTier: c.loyaltyTier,
      })),
    };
  }

  @Get('anniversaries')
  async getAnniversariesInRange(
    @Request() req,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const customers = await this.customerLoyaltyService.getCustomersWithAnniversaries(req.user.companyId, start, end);
    return {
      count: customers.length, startDate: start, endDate: end,
      customers: customers.map((c) => {
        const yearsSince = new Date().getFullYear() - new Date(c.firstPurchaseAt).getFullYear();
        return {
          id: c.id, customerNumber: c.customerNumber, name: c.name,
          email: c.email, phone: c.phone, firstPurchaseAt: c.firstPurchaseAt,
          yearsSince, loyaltyTier: c.loyaltyTier,
        };
      }),
    };
  }
}
