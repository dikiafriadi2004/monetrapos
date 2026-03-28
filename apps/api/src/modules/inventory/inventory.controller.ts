import { Controller, Get, Post, Body, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { InventoryService } from './inventory.service';
import { CreateStockMovementDto } from './dto';
import { RolesGuard, RequireRoles } from '../auth/guards';
import { UserType } from '../../common/enums';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('movements')
  @RequireRoles(UserType.MEMBER)
  @ApiOperation({ summary: 'Record a manual stock adjustment (IN, OUT, ADJUSTMENT, RETURN)' })
  create(@Request() req: any, @Body() dto: CreateStockMovementDto) {
    return this.inventoryService.recordMovement(req.user.id, dto);
  }

  @Get('movements')
  @RequireRoles(UserType.MEMBER, UserType.EMPLOYEE)
  @ApiOperation({ summary: 'Get stock movement history' })
  @ApiQuery({ name: 'storeId', required: false })
  @ApiQuery({ name: 'productId', required: false })
  findAll(
    @Request() req: any,
    @Query('storeId') storeId?: string,
    @Query('productId') productId?: string,
  ) {
    return this.inventoryService.findAll(req.user.id, storeId, productId);
  }
}
