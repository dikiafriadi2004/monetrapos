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
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { ValidatePromoCodeDto, GeneratePromoCodeDto } from './dto/validate-promo-code.dto';

@Controller('discounts')
@UseGuards(AuthGuard('jwt'))
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Post()
  create(@Body() createDto: CreateDiscountDto, @Request() req) {
    return this.discountsService.create(createDto, req.user.companyId || req.user.company_id);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('store_id') storeId?: string,
    @Query('is_active') isActive?: string,
  ) {
    const companyId = req.user.companyId || req.user.company_id;
    const isActiveBoolean = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.discountsService.findAll(companyId, storeId, isActiveBoolean);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.discountsService.findOne(id, req.user.companyId || req.user.company_id);
  }

  @Get(':id/stats')
  getUsageStats(@Param('id') id: string, @Request() req) {
    return this.discountsService.getUsageStats(id, req.user.companyId || req.user.company_id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDiscountDto,
    @Request() req,
  ) {
    return this.discountsService.update(id, updateDto, req.user.companyId || req.user.company_id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.discountsService.remove(id, req.user.companyId || req.user.company_id);
  }

  @Post('validate')
  validatePromoCode(@Body() validateDto: ValidatePromoCodeDto, @Request() req) {
    return this.discountsService.validatePromoCode(validateDto, req.user.companyId || req.user.company_id);
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
