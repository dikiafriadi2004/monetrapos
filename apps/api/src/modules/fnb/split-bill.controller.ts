import { Controller, Get, Post, Body, Param, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SplitBillService } from './split-bill.service';
import type { SplitByItemsDto, SplitByAmountDto } from './split-bill.service';

@Controller('fnb/split-bill')
@UseGuards(AuthGuard('jwt'))
export class SplitBillController {
  constructor(private readonly splitBillService: SplitBillService) {}

  @Get('transactions/:transactionId/items')
  getTransactionItems(@Request() req, @Param('transactionId') transactionId: string) {
    return this.splitBillService.getTransactionItems(req.user.companyId, transactionId);
  }

  @Post('transactions/:transactionId/by-items')
  splitByItems(
    @Request() req,
    @Param('transactionId') transactionId: string,
    @Body() dto: SplitByItemsDto,
  ) {
    return this.splitBillService.splitByItems(req.user.companyId, transactionId, dto);
  }

  @Post('transactions/:transactionId/by-amount')
  splitByAmount(
    @Request() req,
    @Param('transactionId') transactionId: string,
    @Body() dto: SplitByAmountDto,
  ) {
    return this.splitBillService.splitByAmount(req.user.companyId, transactionId, dto);
  }
}
