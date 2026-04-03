import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
} from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { ValidatePromoCodeDto, GeneratePromoCodeDto } from './dto/validate-promo-code.dto';

@Controller('discounts')
// @UseGuards(JwtAuthGuard)
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Post()
  create(@Body() createDto: CreateDiscountDto, @Request() req) {
    const companyId = req.user?.company_id || 'default-company-id';
    return this.discountsService.create(createDto, companyId);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('store_id') storeId?: string,
    @Query('is_active') isActive?: string,
  ) {
    const companyId = req.user?.company_id || 'default-company-id';
    const isActiveBoolean = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.discountsService.findAll(companyId, storeId, isActiveBoolean);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    const companyId = req.user?.company_id || 'default-company-id';
    return this.discountsService.findOne(id, companyId);
  }

  @Get(':id/stats')
  getUsageStats(@Param('id') id: string, @Request() req) {
    const companyId = req.user?.company_id || 'default-company-id';
    return this.discountsService.getUsageStats(id, companyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDiscountDto,
    @Request() req,
  ) {
    const companyId = req.user?.company_id || 'default-company-id';
    return this.discountsService.update(id, updateDto, companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const companyId = req.user?.company_id || 'default-company-id';
    return this.discountsService.remove(id, companyId);
  }

  @Post('validate')
  validatePromoCode(@Body() validateDto: ValidatePromoCodeDto, @Request() req) {
    const companyId = req.user?.company_id || 'default-company-id';
    return this.discountsService.validatePromoCode(validateDto, companyId);
  }

  @Post('generate-code')
  async generatePromoCode(@Body() generateDto: GeneratePromoCodeDto) {
    const code = await this.discountsService.generatePromoCode(
      generateDto.prefix,
      generateDto.length || 8,
    );
    return { promoCode: code };
  }
}
