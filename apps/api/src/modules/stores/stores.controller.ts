import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { deleteOldFile } from '../../common/utils/file.utils';
import { StoresService } from './stores.service';
import { CreateStoreDto, UpdateStoreDto, AssignManagerDto } from './dto';

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
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'type', required: false, enum: ['retail', 'fnb', 'warehouse', 'service'] })
  @ApiQuery({ name: 'managerId', required: false, type: String, description: 'Filter by manager ID' })
  findAll(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
    @Query('type') type?: string,
    @Query('managerId') managerId?: string,
  ) {
    const companyId = req.user.companyId;
    return this.storesService.findAll(companyId, {
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
      isActive: isActive !== undefined ? (isActive === true || (isActive as any) === 'true') : undefined,
      type,
      managerId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get store by ID' })
  findOne(@Param('id') id: string, @Request() req: any) {
    const companyId = req.user.companyId;
    return this.storesService.findOne(id, companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update store' })
  update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdateStoreDto,
  ) {
    const companyId = req.user.companyId;
    return this.storesService.update(id, dto, companyId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete store' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: any) {
    const companyId = req.user.companyId;
    return this.storesService.remove(id, companyId);
  }

  @Post(':id/assign-manager')
  @ApiOperation({ summary: 'Assign a manager to a store' })
  @ApiParam({ name: 'id', description: 'Store ID' })
  assignManager(
    @Param('id') id: string,
    @Body() dto: AssignManagerDto,
    @Request() req: any,
  ) {
    const companyId = req.user.companyId;
    return this.storesService.assignManager(id, dto.managerId, companyId);
  }

  @Delete(':id/manager')
  @ApiOperation({ summary: 'Remove manager from a store' })
  @ApiParam({ name: 'id', description: 'Store ID' })
  @HttpCode(HttpStatus.OK)
  removeManager(@Param('id') id: string, @Request() req: any) {
    const companyId = req.user.companyId;
    return this.storesService.removeManager(id, companyId);
  }

  @Get('manager/:managerId')
  @ApiOperation({ summary: 'Get all stores managed by a specific user' })
  @ApiParam({ name: 'managerId', description: 'Manager user ID' })
  findByManager(@Param('managerId') managerId: string, @Request() req: any) {
    const companyId = req.user.companyId;
    return this.storesService.findByManager(managerId, companyId);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get store statistics' })
  @ApiParam({ name: 'id', description: 'Store ID' })
  getStats(@Param('id') id: string, @Request() req: any) {
    const companyId = req.user.companyId;
    return this.storesService.getStoreStats(id, companyId);
  }

  @Post(':id/upload-logo')
  @ApiOperation({ summary: 'Upload store receipt logo' })
  @ApiParam({ name: 'id', description: 'Store ID' })
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const dir = join(process.cwd(), 'uploads', 'store-logos');
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        cb(null, `store-logo-${Date.now()}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
      if (!allowed.includes(extname(file.originalname).toLowerCase())) {
        return cb(new BadRequestException('Only image files allowed'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  async uploadLogo(
    @Param('id') id: string,
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const companyId = req.user.companyId;
    const logoUrl = `/uploads/store-logos/${file.filename}`;

    // Delete old logo — get store first
    try {
      const storeResult = await this.storesService.findAll(companyId);
      const storeList = (storeResult as any).data || storeResult;
      const store = Array.isArray(storeList) ? storeList.find((s: any) => s.id === id) : null;
      if (store?.receiptLogoUrl) deleteOldFile(store.receiptLogoUrl);
    } catch {}

    await this.storesService.update(id, { receiptLogoUrl: logoUrl } as any, companyId);
    return { logoUrl };
  }
}
