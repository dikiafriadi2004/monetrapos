import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { MemberJwtGuard } from '../auth/guards/member-jwt.guard';
import { StockOpnameService } from './stock-opname.service';
import { CreateStockOpnameDto } from './dto/create-stock-opname.dto';
import { UpdateStockOpnameDto } from './dto/update-stock-opname.dto';
import { StockOpnameStatus } from './stock-opname.entity';

@Controller('stock-opnames')
@UseGuards(MemberJwtGuard)
export class StockOpnameController {
  constructor(private readonly stockOpnameService: StockOpnameService) {}

  @Post()
  create(@Request() req, @Body() createDto: CreateStockOpnameDto) {
    return this.stockOpnameService.create(
      req.user.companyId,
      req.user.id,
      createDto,
    );
  }

  @Get()
  findAll(
    @Request() req,
    @Query('status') status?: StockOpnameStatus,
    @Query('store_id') storeId?: string,
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
  ) {
    const filters: any = {};
    if (status) filters.status = status;
    if (storeId) filters.store_id = storeId;
    if (fromDate) filters.from_date = new Date(fromDate);
    if (toDate) filters.to_date = new Date(toDate);
    return this.stockOpnameService.findAll(req.user.companyId, filters);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.stockOpnameService.findOne(req.user.companyId, id);
  }

  @Get(':id/discrepancy-report')
  getDiscrepancyReport(@Request() req, @Param('id') id: string) {
    return this.stockOpnameService.getDiscrepancyReport(req.user.companyId, id);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() updateDto: UpdateStockOpnameDto) {
    return this.stockOpnameService.update(req.user.companyId, id, updateDto);
  }

  @Post(':id/complete')
  complete(
    @Request() req,
    @Param('id') id: string,
    @Body('apply_adjustments') applyAdjustments?: boolean,
  ) {
    return this.stockOpnameService.complete(
      req.user.companyId,
      id,
      req.user.id,
      applyAdjustments ?? true,
    );
  }

  @Post(':id/cancel')
  cancel(@Request() req, @Param('id') id: string) {
    return this.stockOpnameService.cancel(req.user.companyId, id);
  }
}
