import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CustomersService } from './customers.service';
import { AddPointsDto, RedeemPointsDto } from './dto';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new customer' })
  create(@Request() req: any, @Body() dto: any) {
    const companyId = req.user.companyId;
    return this.customersService.create(dto, companyId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all customers for current company' })
  @ApiQuery({ name: 'storeId', required: false })
  findAll(@Request() req: any, @Query('storeId') storeId?: string) {
    const companyId = req.user.companyId;
    return this.customersService.findAll(companyId, storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  findOne(@Param('id') id: string, @Request() req: any) {
    const companyId = req.user.companyId;
    return this.customersService.findOne(id, companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer' })
  update(@Param('id') id: string, @Request() req: any, @Body() dto: any) {
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
    return this.customersService.addPoints(dto.customerId, companyId, dto);
  }

  @Post('loyalty/redeem-points')
  @ApiOperation({ summary: 'Redeem loyalty points from customer' })
  redeemPoints(@Request() req: any, @Body() dto: RedeemPointsDto) {
    const companyId = req.user.companyId;
    return this.customersService.redeemPoints(dto.customerId, companyId, dto);
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
