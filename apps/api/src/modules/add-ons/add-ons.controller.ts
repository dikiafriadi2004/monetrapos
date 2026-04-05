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
import { AuthGuard } from '@nestjs/passport';
import { AddOnsService } from './add-ons.service';
import { CompanyAddOnsService } from './company-add-ons.service';
import { CreateAddOnDto } from './dto/create-add-on.dto';
import { UpdateAddOnDto } from './dto/update-add-on.dto';
import { PurchaseAddOnDto } from './dto/purchase-add-on.dto';
import { AddOnStatus } from './add-on.entity';

@Controller('add-ons')
@UseGuards(AuthGuard('jwt'))
export class AddOnsController {
  constructor(
    private readonly addOnsService: AddOnsService,
    private readonly companyAddOnsService: CompanyAddOnsService,
  ) {}

  // ==================== Super Admin Endpoints ====================

  /**
   * Get all add-ons including inactive (Super Admin only)
   */
  @Get('admin/all')
  async findAllAdmin() {
    return await this.addOnsService.findAll({});
  }

  /**
   * Create new add-on (Super Admin only)
   */
  @Post('admin')
  // @UseGuards(RolesGuard)
  // @Roles('super_admin')
  async createAddOn(@Body() createAddOnDto: CreateAddOnDto) {
    return await this.addOnsService.create(createAddOnDto);
  }

  /**
   * Update add-on (Super Admin only)
   */
  @Patch('admin/:id')
  // @UseGuards(RolesGuard)
  // @Roles('super_admin')
  async updateAddOn(
    @Param('id') id: string,
    @Body() updateAddOnDto: UpdateAddOnDto,
  ) {
    return await this.addOnsService.update(id, updateAddOnDto);
  }

  /**
   * Delete add-on (Super Admin only)
   */
  @Delete('admin/:id')
  // @UseGuards(RolesGuard)
  // @Roles('super_admin')
  async deleteAddOn(@Param('id') id: string) {
    await this.addOnsService.remove(id);
    return { message: 'Add-on deleted successfully' };
  }

  // ==================== Public/Member Endpoints ====================

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
