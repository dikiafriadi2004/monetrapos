import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { MemberJwtGuard } from '../auth/guards/member-jwt.guard';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto, AddPointsDto, RedeemPointsDto } from './dto';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(MemberJwtGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new customer' })
  async create(@Request() req: any, @Body() dto: CreateCustomerDto) {
    const companyId = req.user.companyId;
    // Auto-inject storeId if not provided
    if (!dto.storeId) {
      const result = await this.customersService['customerRepo'].manager.query(
        `SELECT id FROM stores WHERE company_id = ? AND is_active = 1 ORDER BY created_at ASC LIMIT 1`,
        [companyId]
      );
      if (result?.[0]?.id) dto.storeId = result[0].id;
    }
    return this.customersService.create(dto, companyId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all customers for current company' })
  @ApiQuery({ name: 'storeId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Request() req: any,
    @Query('storeId') storeId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    const companyId = req.user.companyId;
    return this.customersService.findAll(companyId, {
      storeId,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  findOne(@Param('id') id: string, @Request() req: any) {
    const companyId = req.user.companyId;
    return this.customersService.findOne(id, companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer' })
  update(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateCustomerDto) {
    const companyId = req.user.companyId;
    return this.customersService.update(id, companyId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete customer' })
  remove(@Param('id') id: string, @Request() req: any) {
    const companyId = req.user.companyId;
    return this.customersService.remove(id, companyId);
  }

  // Loyalty Points Endpoints
  @Post('loyalty/add-points')
  @ApiOperation({ summary: 'Add loyalty points to customer' })
  addPoints(@Request() req: any, @Body() dto: AddPointsDto) {
    const companyId = req.user.companyId;
    const performedBy = req.user.userId;
    return this.customersService.addPoints(dto.customerId, companyId, dto, performedBy);
  }

  @Post('loyalty/redeem-points')
  @ApiOperation({ summary: 'Redeem loyalty points from customer' })
  redeemPoints(@Request() req: any, @Body() dto: RedeemPointsDto) {
    const companyId = req.user.companyId;
    const performedBy = req.user.userId;
    return this.customersService.redeemPoints(dto.customerId, companyId, dto, performedBy);
  }

  @Get(':id/purchase-history')
  @ApiOperation({ summary: 'Get customer purchase history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getPurchaseHistory(
    @Param('id') id: string,
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const companyId = req.user.companyId;
    return this.customersService.getPurchaseHistory(id, companyId, {
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get(':id/loyalty-history')
  @ApiOperation({ summary: 'Get customer loyalty point transaction history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getLoyaltyHistory(
    @Param('id') id: string,
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const companyId = req.user.companyId;
    return this.customersService.getLoyaltyPointHistory(id, companyId, {
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get('loyalty/points-value/:points')
  @ApiOperation({ summary: 'Calculate monetary value of loyalty points' })
  getPointsValue(@Param('points') points: number) {
    // 1 point = Rp 100
    const pointValue = 100;
    return {
      points,
      value: points * pointValue,
    };
  }
}
