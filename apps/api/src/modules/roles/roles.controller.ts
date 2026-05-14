import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { MemberJwtGuard } from '../auth/guards/member-jwt.guard';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { PermissionGuard, RequirePermissions } from '../auth/guards';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto } from './dto';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(MemberJwtGuard, PermissionGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermissions('employee.manage_role')
  @ApiOperation({ summary: 'Create a new custom role' })
  create(@Body() dto: CreateRoleDto, @Request() req: any) {
    // storeId dari JWT jika tidak dikirim dari body
    if (!dto.storeId && req.user?.storeId) dto.storeId = req.user.storeId;
    return this.rolesService.create(dto);
  }

  @Get()
  @RequirePermissions('employee.view')
  @ApiOperation({ summary: 'Get all roles for a company' })
  @ApiQuery({ name: 'storeId', required: false })
  findAll(@Query('storeId') storeId: string, @Request() req: any) {
    // Jika storeId tidak dikirim, ambil semua role milik company
    return this.rolesService.findAllByCompany(req.user.companyId, storeId);
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Get all available permissions' })
  getPermissions() {
    return this.rolesService.findAllPermissions();
  }

  @Get(':id')
  @RequirePermissions('employee.view')
  @ApiOperation({ summary: 'Get role by ID with permissions' })
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('employee.manage_role')
  @ApiOperation({ summary: 'Update role and its permissions' })
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('employee.manage_role')
  @ApiOperation({ summary: 'Delete a custom role' })
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}

/**
 * Admin endpoint — get all permissions (no member token required)
 * GET /api/admin/roles/permissions
 */
@ApiTags('Admin - Roles')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/roles')
export class AdminRolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('permissions')
  @ApiOperation({ summary: 'Get all available permissions (admin)' })
  getPermissions() {
    return this.rolesService.findAllPermissions();
  }
}
