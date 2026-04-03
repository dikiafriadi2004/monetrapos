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
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard, RequirePermissions } from '../auth/guards';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto } from './dto';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermissions('employee.manage_role')
  @ApiOperation({ summary: 'Create a new custom role' })
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Get()
  @RequirePermissions('employee.view')
  @ApiOperation({ summary: 'Get all roles for a store' })
  @ApiQuery({ name: 'storeId', required: true })
  findAll(@Query('storeId') storeId: string) {
    return this.rolesService.findAllByStore(storeId);
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
