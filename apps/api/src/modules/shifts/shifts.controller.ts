import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ShiftsService } from './shifts.service';
import { OpenShiftDto, CloseShiftDto, ShiftReconciliationDto } from './dto';
import { RolesGuard, RequireRoles } from '../auth/guards';
import { UserType } from '../../common/enums';

@ApiTags('Shifts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post('open')
  @RequireRoles(UserType.EMPLOYEE, UserType.MEMBER)
  @ApiOperation({ summary: 'Open a cashier register shift' })
  openShift(@Request() req: any, @Body() dto: OpenShiftDto) {
    const userId = req.user.id;
    const userType = req.user.userType;
    const memberId = userType === UserType.MEMBER ? userId : null;
    const employeeId = userType === UserType.EMPLOYEE ? userId : null;
    return this.shiftsService.openShift(memberId, employeeId, dto);
  }

  @Patch(':id/close')
  @RequireRoles(UserType.EMPLOYEE, UserType.MEMBER)
  @ApiOperation({ summary: 'Close a cashier register shift' })
  closeShift(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: CloseShiftDto,
  ) {
    const userId = req.user.id;
    const userType = req.user.userType;
    const memberId = userType === UserType.MEMBER ? userId : null;
    const employeeId = userType === UserType.EMPLOYEE ? userId : null;
    return this.shiftsService.closeShift(id, memberId, employeeId, dto);
  }

  @Post('reconcile')
  @RequireRoles(UserType.MEMBER)
  @ApiOperation({ summary: 'Reconcile shift with actual cash count' })
  reconcileShift(@Request() req: any, @Body() dto: ShiftReconciliationDto) {
    return this.shiftsService.reconcileShift(req.user.id, dto);
  }

  @Get(':id/report')
  @RequireRoles(UserType.MEMBER)
  @ApiOperation({ summary: 'Get detailed shift report' })
  getShiftReport(@Param('id') id: string, @Request() req: any) {
    return this.shiftsService.getShiftReport(id, req.user.id);
  }

  @Get('active')
  @RequireRoles(UserType.EMPLOYEE, UserType.MEMBER)
  @ApiOperation({ summary: 'Get current active shift for user' })
  @ApiQuery({ name: 'storeId', required: true })
  getActive(@Request() req: any, @Query('storeId') storeId: string) {
    const userId = req.user.id;
    const userType = req.user.userType;
    const memberId = userType === UserType.MEMBER ? userId : null;
    const employeeId = userType === UserType.EMPLOYEE ? userId : null;
    return this.shiftsService.getActiveShift(memberId, employeeId, storeId);
  }

  @Get()
  @RequireRoles(UserType.MEMBER)
  @ApiOperation({
    summary: 'Get all shifts history for a store (Manager only)',
  })
  @ApiQuery({ name: 'storeId', required: false })
  findAll(@Request() req: any, @Query('storeId') storeId?: string) {
    return this.shiftsService.findAll(req.user.id, storeId);
  }
}
