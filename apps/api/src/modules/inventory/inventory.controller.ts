import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
  UseGuards,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { InventoryService } from './inventory.service';
import {
  CreateStockMovementDto,
  ReserveStockDto,
  TransferStockDto,
} from './dto';
import { RolesGuard, RequireRoles } from '../auth/guards';
import { UserType } from '../../common/enums';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @RequireRoles(UserType.MEMBER)
  @ApiOperation({ summary: 'Get inventory by store with filters' })
  @ApiQuery({ name: 'storeId', required: true })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'lowStock', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getInventory(
    @Request() req: any,
    @Query('storeId') storeId: string,
    @Query('productId') productId?: string,
    @Query('lowStock') lowStock?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.inventoryService.getInventoryByStore(req.user.companyId, storeId, {
      productId,
      lowStock,
      page,
      limit,
    });
  }

  @Get('by-product/:productId')
  @RequireRoles(UserType.MEMBER)
  @ApiOperation({ summary: 'Get inventory for a product across all stores' })
  @ApiQuery({ name: 'variantId', required: false })
  async getInventoryByProduct(
    @Request() req: any,
    @Param('productId') productId: string,
    @Query('variantId') variantId?: string,
  ) {
    return this.inventoryService.getInventoryByProduct(
      req.user.companyId,
      productId,
      variantId,
    );
  }

  @Get('available-quantity')
  @RequireRoles(UserType.MEMBER)
  @ApiOperation({ summary: 'Get available quantity for a product/variant' })
  @ApiQuery({ name: 'storeId', required: true })
  @ApiQuery({ name: 'productId', required: true })
  @ApiQuery({ name: 'variantId', required: false })
  async getAvailableQuantity(
    @Request() req: any,
    @Query('storeId') storeId: string,
    @Query('productId') productId: string,
    @Query('variantId') variantId?: string,
  ) {
    const quantity = await this.inventoryService.getAvailableQuantity(
      req.user.companyId,
      storeId,
      productId,
      variantId,
    );
    return { availableQuantity: quantity };
  }

  @Get('low-stock')
  @RequireRoles(UserType.MEMBER)
  @ApiOperation({ summary: 'Get products with low stock in a store' })
  @ApiQuery({ name: 'storeId', required: true })
  async getLowStock(
    @Request() req: any,
    @Query('storeId') storeId: string,
  ) {
    return this.inventoryService.getLowStockProducts(
      req.user.companyId,
      storeId,
    );
  }

  @Post('low-stock/alerts')
  @RequireRoles(UserType.MEMBER)
  @ApiOperation({ summary: 'Send low stock alerts via email' })
  async sendLowStockAlerts(
    @Request() req: any,
    @Query('storeId') storeIdQuery?: string,
    @Query('email') emailQuery?: string,
    @Body() body?: { storeId?: string; email?: string },
  ) {
    const storeId = storeIdQuery || body?.storeId || '';
    const email = emailQuery || body?.email || req.user?.email || '';
    return this.inventoryService.sendLowStockAlerts(
      req.user.companyId,
      storeId,
      email,
    );
  }

  @Post('movements')
  @RequireRoles(UserType.MEMBER)
  @ApiOperation({
    summary: 'Record a manual stock adjustment (IN, OUT, ADJUSTMENT, RETURN)',
  })
  async createMovement(
    @Request() req: any,
    @Body() dto: CreateStockMovementDto,
  ) {
    return this.inventoryService.recordMovement(
      req.user.companyId,
      req.user.id,
      dto,
    );
  }

  @Get('movements')
  @RequireRoles(UserType.MEMBER)
  @ApiOperation({ summary: 'Get stock movement history' })
  @ApiQuery({ name: 'storeId', required: false })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'variantId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMovements(
    @Request() req: any,
    @Query('storeId') storeId?: string,
    @Query('productId') productId?: string,
    @Query('variantId') variantId?: string,
    @Query('type') type?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.inventoryService.findMovements(req.user.companyId, {
      storeId,
      productId,
      variantId,
      type: type as any,
      page,
      limit,
    });
  }

  @Post('reserve')
  @RequireRoles(UserType.MEMBER)
  @ApiOperation({ summary: 'Reserve stock for pending orders' })
  async reserveStock(@Request() req: any, @Body() dto: ReserveStockDto) {
    return this.inventoryService.reserveStock(
      req.user.companyId,
      req.user.id,
      dto,
    );
  }

  @Post('release')
  @RequireRoles(UserType.MEMBER)
  @ApiOperation({ summary: 'Release reserved stock' })
  async releaseStock(@Request() req: any, @Body() dto: ReserveStockDto) {
    return this.inventoryService.releaseStock(
      req.user.companyId,
      req.user.id,
      dto,
    );
  }

  @Post('transfer')
  @RequireRoles(UserType.MEMBER)
  @ApiOperation({ summary: 'Transfer stock between stores' })
  async transferStock(@Request() req: any, @Body() dto: TransferStockDto) {
    return this.inventoryService.transferStock(
      req.user.companyId,
      req.user.id,
      dto,
    );
  }
}
