import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto, UpdateTableStatusDto } from './dto/update-table.dto';
import { MemberJwtGuard } from '../auth/guards/member-jwt.guard';
import { TableStatus } from './table.entity';

@Controller('fnb/tables')
@UseGuards(MemberJwtGuard)
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  create(@Body() createTableDto: CreateTableDto, @Request() req) {
    return this.tablesService.create(createTableDto, req.user.companyId);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('store_id') storeId?: string,
    @Query('floor') floor?: string,
    @Query('section') section?: string,
    @Query('status') status?: TableStatus,
  ) {
    return this.tablesService.findAll(
      req.user.companyId,
      storeId,
      floor,
      section,
      status,
    );
  }

  @Get('floor-plan')
  getFloorPlan(
    @Request() req,
    @Query('store_id') storeId: string,
    @Query('floor') floor?: string,
  ) {
    if (!storeId) {
      throw new Error('store_id is required');
    }
    return this.tablesService.getFloorPlan(req.user.companyId, storeId, floor);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.tablesService.findOne(id, req.user.companyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTableDto: UpdateTableDto,
    @Request() req,
  ) {
    return this.tablesService.update(id, updateTableDto, req.user.companyId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateTableStatusDto,
    @Request() req,
  ) {
    return this.tablesService.updateStatus(id, updateStatusDto, req.user.companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.tablesService.remove(id, req.user.companyId);
  }
}
