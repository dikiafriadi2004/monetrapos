import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard, RequirePermissions } from '../auth/guards';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @RequirePermissions('employee.create')
  @ApiOperation({ summary: 'Create a new employee' })
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Get()
  @RequirePermissions('employee.view')
  @ApiOperation({ summary: 'Get all employees for a store' })
  @ApiQuery({ name: 'storeId', required: true })
  findAll(@Query('storeId') storeId: string) {
    return this.employeesService.findAllByStore(storeId);
  }

  @Get(':id')
  @RequirePermissions('employee.view')
  @ApiOperation({ summary: 'Get employee by ID' })
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('employee.edit')
  @ApiOperation({ summary: 'Update employee' })
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('employee.delete')
  @ApiOperation({ summary: 'Delete employee' })
  remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }
}
