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
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard, RequirePermissions } from '../auth/guards';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, UpdateEmployeeDto, LinkUserDto, CreateUserAccountDto, ClockInDto, ClockOutDto } from './dto';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @RequirePermissions('employee.create')
  @ApiOperation({ summary: 'Create a new employee' })
  create(@Body() dto: CreateEmployeeDto, @Req() req: any) {
    const companyId = req.user.companyId;
    return this.employeesService.create(companyId, dto);
  }

  @Get()
  @RequirePermissions('employee.view')
  @ApiOperation({ summary: 'Get all employees for company (optionally filtered by store)' })
  @ApiQuery({ name: 'storeId', required: false, description: 'Filter by store ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(
    @Req() req: any,
    @Query('storeId') storeId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    const companyId = req.user.companyId;
    return this.employeesService.findAllByCompany(companyId, {
      storeId,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
      isActive: isActive !== undefined ? (isActive === true || (isActive as any) === 'true') : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('employee.view')
  @ApiOperation({ summary: 'Get employee by ID' })
  findOne(@Param('id') id: string, @Req() req: any) {
    const companyId = req.user.companyId;
    return this.employeesService.findOne(id, companyId);
  }

  @Patch(':id')
  @RequirePermissions('employee.edit')
  @ApiOperation({ summary: 'Update employee' })
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto, @Req() req: any) {
    const companyId = req.user.companyId;
    return this.employeesService.update(id, dto, companyId);
  }

  @Delete(':id')
  @RequirePermissions('employee.delete')
  @ApiOperation({ summary: 'Delete employee (soft delete)' })
  remove(@Param('id') id: string, @Req() req: any) {
    const companyId = req.user.companyId;
    return this.employeesService.remove(id, companyId);
  }

  @Post(':id/link-user')
  @RequirePermissions('employee.edit')
  @ApiOperation({ summary: 'Link employee to existing user account' })
  linkToUser(@Param('id') id: string, @Body() dto: LinkUserDto, @Req() req: any) {
    const companyId = req.user.companyId;
    return this.employeesService.linkToUser(id, dto.userId, companyId);
  }

  @Post(':id/create-user')
  @RequirePermissions('employee.edit')
  @ApiOperation({ summary: 'Create user account for employee' })
  createUserAccount(@Param('id') id: string, @Body() dto: CreateUserAccountDto, @Req() req: any) {
    const companyId = req.user.companyId;
    return this.employeesService.createUserAccount(id, dto, companyId);
  }

  @Post(':id/clock-in')
  @RequirePermissions('employee.clock_in_out')
  @ApiOperation({ summary: 'Clock in employee' })
  clockIn(@Param('id') id: string, @Body() dto: ClockInDto, @Req() req: any) {
    const companyId = req.user.companyId;
    return this.employeesService.clockIn(id, dto, companyId);
  }

  @Post(':id/clock-out')
  @RequirePermissions('employee.clock_in_out')
  @ApiOperation({ summary: 'Clock out employee' })
  clockOut(@Param('id') id: string, @Body() dto: ClockOutDto, @Req() req: any) {
    const companyId = req.user.companyId;
    return this.employeesService.clockOut(id, dto, companyId);
  }

  @Get(':id/attendance')
  @RequirePermissions('employee.view')
  @ApiOperation({ summary: 'Get employee attendance history' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getAttendanceHistory(
    @Param('id') id: string,
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const companyId = req.user.companyId;
    return this.employeesService.getAttendanceHistory(id, companyId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get(':id/clock-in-status')
  @RequirePermissions('employee.view')
  @ApiOperation({ summary: 'Get current clock-in status for employee' })
  getCurrentClockInStatus(@Param('id') id: string, @Req() req: any) {
    const companyId = req.user.companyId;
    return this.employeesService.getCurrentClockInStatus(id, companyId);
  }
}
