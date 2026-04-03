import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard, RequirePermissions } from '../auth/guards';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
  CreateQrisConfigDto,
  UpdateQrisConfigDto,
} from './dto';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ────── Payment Methods ──────

  @Post('payment-methods')
  @RequirePermissions('finance.manage_payment')
  @ApiOperation({ summary: 'Create a payment method' })
  createPaymentMethod(@Body() dto: CreatePaymentMethodDto) {
    return this.paymentsService.createPaymentMethod(dto);
  }

  @Get('payment-methods')
  @ApiOperation({ summary: 'Get all payment methods for a store' })
  @ApiQuery({ name: 'storeId', required: true })
  findAllPaymentMethods(@Query('storeId') storeId: string) {
    return this.paymentsService.findAllPaymentMethods(storeId);
  }

  @Get('payment-methods/active')
  @ApiOperation({ summary: 'Get active payment methods for a store' })
  @ApiQuery({ name: 'storeId', required: true })
  findActivePaymentMethods(@Query('storeId') storeId: string) {
    return this.paymentsService.findActivePaymentMethods(storeId);
  }

  @Get('payment-methods/:id')
  @ApiOperation({ summary: 'Get payment method by ID' })
  findOnePaymentMethod(@Param('id') id: string) {
    return this.paymentsService.findOnePaymentMethod(id);
  }

  @Patch('payment-methods/:id')
  @RequirePermissions('finance.manage_payment')
  @ApiOperation({ summary: 'Update payment method' })
  updatePaymentMethod(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.paymentsService.updatePaymentMethod(id, dto);
  }

  @Delete('payment-methods/:id')
  @RequirePermissions('finance.manage_payment')
  @ApiOperation({ summary: 'Delete payment method' })
  removePaymentMethod(@Param('id') id: string) {
    return this.paymentsService.removePaymentMethod(id);
  }

  // ────── QRIS Config ──────

  @Post('qris')
  @RequirePermissions('finance.manage_payment')
  @ApiOperation({ summary: 'Upload and configure QRIS' })
  createQrisConfig(@Body() dto: CreateQrisConfigDto) {
    return this.paymentsService.createQrisConfig(dto);
  }

  @Get('qris')
  @ApiOperation({ summary: 'Get QRIS configurations for a store' })
  @ApiQuery({ name: 'storeId', required: true })
  findQrisConfigs(@Query('storeId') storeId: string) {
    return this.paymentsService.findQrisConfigByStore(storeId);
  }

  @Get('qris/active')
  @ApiOperation({ summary: 'Get active QRIS config for a store' })
  @ApiQuery({ name: 'storeId', required: true })
  findActiveQris(@Query('storeId') storeId: string) {
    return this.paymentsService.findActiveQrisConfig(storeId);
  }

  @Patch('qris/:id')
  @RequirePermissions('finance.manage_payment')
  @ApiOperation({ summary: 'Update QRIS config' })
  updateQrisConfig(@Param('id') id: string, @Body() dto: UpdateQrisConfigDto) {
    return this.paymentsService.updateQrisConfig(id, dto);
  }

  @Delete('qris/:id')
  @RequirePermissions('finance.manage_payment')
  @ApiOperation({ summary: 'Delete QRIS config' })
  removeQrisConfig(@Param('id') id: string) {
    return this.paymentsService.removeQrisConfig(id);
  }
}
