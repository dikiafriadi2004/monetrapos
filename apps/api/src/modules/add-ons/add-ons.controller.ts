import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MemberJwtGuard } from '../auth/guards/member-jwt.guard';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { AddOnsService } from './add-ons.service';
import { CompanyAddOnsService } from './company-add-ons.service';
import { CreateAddOnDto } from './dto/create-add-on.dto';
import { UpdateAddOnDto } from './dto/update-add-on.dto';
import { PurchaseAddOnDto } from './dto/purchase-add-on.dto';
import { AddOnStatus } from './add-on.entity';

// ==================== Admin Controller ====================

@ApiTags('Admin - Add-ons')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/add-ons')
export class AdminAddOnsController {
  constructor(private readonly addOnsService: AddOnsService) {}

  @Get()
  async findAll() {
    return this.addOnsService.findAll({});
  }

  @Post()
  async create(@Body() dto: CreateAddOnDto) {
    return this.addOnsService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAddOnDto) {
    return this.addOnsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.addOnsService.remove(id);
    return { message: 'Add-on deleted successfully' };
  }
}

// ==================== Member Controller ====================

@ApiTags('Add-ons')
@ApiBearerAuth()
@UseGuards(MemberJwtGuard)
@Controller('add-ons')
export class AddOnsController {
  constructor(
    private readonly addOnsService: AddOnsService,
    private readonly companyAddOnsService: CompanyAddOnsService,
  ) {}

  /**
   * Get all available add-ons
   */
  @Get()
  async findAll(@Query('category') category?: string) {
    return await this.addOnsService.findAll({
      status: AddOnStatus.ACTIVE,
      category,
    });
  }

  /**
   * Get add-on by ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.addOnsService.findOne(id);
  }

  /**
   * Get company's purchased add-ons
   */
  @Get('purchased/list')
  async getPurchasedAddOns(@Request() req) {
    const companyId = req.user.companyId;
    return await this.companyAddOnsService.findByCompany(companyId);
  }

  /**
   * Get company's active add-ons
   */
  @Get('purchased/active')
  async getActiveAddOns(@Request() req) {
    const companyId = req.user.companyId;
    return await this.companyAddOnsService.findActiveByCompany(companyId);
  }

  /**
   * Purchase an add-on
   */
  @Post('purchase')
  async purchaseAddOn(@Request() req, @Body() purchaseDto: PurchaseAddOnDto) {
    const companyId = req.user.companyId;
    return await this.companyAddOnsService.purchaseAddOn(companyId, purchaseDto);
  }

  /**
   * Cancel add-on subscription
   */
  @Post(':id/cancel')
  async cancelAddOn(@Request() req, @Param('id') companyAddOnId: string) {
    const companyId = req.user.companyId;
    return await this.companyAddOnsService.cancelAddOn(companyId, companyAddOnId);
  }

  /**
   * Check if company has specific add-on
   */
  @Get('check/:slug')
  async checkAddOn(@Request() req, @Param('slug') slug: string) {
    const companyId = req.user.companyId;
    const hasAddOn = await this.companyAddOnsService.hasAddOn(companyId, slug);
    return { hasAddOn };
  }
}
