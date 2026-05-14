import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Request, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MemberJwtGuard } from '../auth/guards/member-jwt.guard';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/create-expense.dto';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(MemberJwtGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tambah biaya operasional' })
  create(@Request() req: any, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(req.user.companyId, req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Daftar biaya operasional' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'storeId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('category') category?: string,
    @Query('storeId') storeId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.expensesService.findAll(req.user.companyId, {
      startDate,
      endDate,
      category,
      storeId,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Get('summary/monthly')
  @ApiOperation({ summary: 'Ringkasan biaya per bulan dalam satu tahun' })
  @ApiQuery({ name: 'year', required: false })
  getMonthlySummary(
    @Request() req: any,
    @Query('year') year?: string,
  ) {
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    return this.expensesService.getSummaryByMonth(req.user.companyId, targetYear);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail biaya' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.expensesService.findOne(id, req.user.companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update biaya' })
  update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(id, req.user.companyId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Hapus biaya' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.expensesService.remove(id, req.user.companyId);
  }
}
