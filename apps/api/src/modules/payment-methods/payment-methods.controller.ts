import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentMethodsService } from './payment-methods.service';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto } from './dto';
import { PermissionGuard, RequirePermissions } from '../auth/guards';

@Controller('payment-methods')
@UseGuards(AuthGuard('jwt'))
export class PaymentMethodsController {
  constructor(
    private readonly paymentMethodsService: PaymentMethodsService,
  ) {}

  /**
   * Get all payment methods for current company
   * GET /payment-methods
   */
  @Get()
  async findAll(@Request() req: any) {
    const companyId = req.user.companyId;
    return this.paymentMethodsService.findByCompany(companyId);
  }

  /**
   * Create a custom payment method
   * POST /payment-methods
   */
  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermissions('finance.manage_settings')
  async create(@Request() req: any, @Body() dto: CreatePaymentMethodDto) {
    const companyId = req.user.companyId;
    return this.paymentMethodsService.create({ ...dto, companyId });
  }

  /**
   * Update a payment method
   * PATCH /payment-methods/:id
   */
  @Patch(':id')
  @UseGuards(PermissionGuard)
  @RequirePermissions('finance.manage_settings')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    const companyId = req.user.companyId;
    return this.paymentMethodsService.update(id, companyId, dto);
  }

  /**
   * Toggle payment method active status
   * PATCH /payment-methods/:id/toggle
   */
  @Patch(':id/toggle')
  @UseGuards(PermissionGuard)
  @RequirePermissions('finance.manage_settings')
  async toggle(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.paymentMethodsService.toggle(id, companyId);
  }

  /**
   * Delete a payment method
   * DELETE /payment-methods/:id
   */
  @Delete(':id')
  @UseGuards(PermissionGuard)
  @RequirePermissions('finance.manage_settings')
  async delete(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    await this.paymentMethodsService.delete(id, companyId);
    return { message: 'Payment method deleted successfully' };
  }
}
