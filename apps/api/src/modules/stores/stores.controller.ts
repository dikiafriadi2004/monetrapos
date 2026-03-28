import { Controller, Get, Post, Patch, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { StoresService } from './stores.service';
import { CreateStoreDto, UpdateStoreDto } from './dto';

@ApiTags('Stores')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new store' })
  create(@Request() req: any, @Body() dto: CreateStoreDto) {
    const companyId = req.user.companyId;
    return this.storesService.create(dto, companyId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all stores for current company' })
  findAll(@Request() req: any) {
    const companyId = req.user.companyId;
    return this.storesService.findAll(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get store by ID' })
  findOne(@Param('id') id: string, @Request() req: any) {
    const companyId = req.user.companyId;
    return this.storesService.findOne(id, companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update store' })
  update(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateStoreDto) {
    const companyId = req.user.companyId;
    return this.storesService.update(id, dto, companyId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete store' })
  remove(@Param('id') id: string, @Request() req: any) {
    const companyId = req.user.companyId;
    return this.storesService.remove(id, companyId);
  }
}
