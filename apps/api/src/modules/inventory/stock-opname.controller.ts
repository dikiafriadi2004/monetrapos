import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  // UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { StockOpnameService } from './stock-opname.service';
import { CreateStockOpnameDto } from './dto/create-stock-opname.dto';
import { UpdateStockOpnameDto } from './dto/update-stock-opname.dto';
import { StockOpnameStatus } from './stock-opname.entity';
// TODO: Import actual guards when auth module is updated
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('stock-opnames')
// @UseGuards(JwtAuthGuard)
export class StockOpnameController {
  constructor(private readonly stockOpnameService: StockOpnameService) {}

  @Post()
  create(@Request() req, @Body() createDto: CreateStockOpnameDto) {
    return this.stockOpnameService.create(
      req.user.company_id,
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

    return this.stockOpnameService.findAll(req.user.company_id, filters);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.stockOpnameService.findOne(req.user.company_id, id);
  }

  @Get(':id/discrepancy-report')
  getDiscrepancyReport(@Request() req, @Param('id') id: string) {
    return this.stockOpnameService.getDiscrepancyReport(
      req.user.company_id,
      id,
    );
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateStockOpnameDto,
  ) {
    return this.stockOpnameService.update(
      req.user.company_id,
      id,
      updateDto,
    );
  }

  @Post(':id/complete')
  complete(
    @Request() req,
    @Param('id') id: string,
    @Body('apply_adjustments') applyAdjustments?: boolean,
  ) {
    return this.stockOpnameService.complete(
      req.user.company_id,
      id,
      req.user.id,
      applyAdjustments ?? true,
    );
  }

  @Post(':id/cancel')
  cancel(@Request() req, @Param('id') id: string) {
    return this.stockOpnameService.cancel(req.user.company_id, id);
  }
}
