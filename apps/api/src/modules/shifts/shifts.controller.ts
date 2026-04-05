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
import { OpenShiftDto, CloseShiftDto } from './dto';

@ApiTags('Shifts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post('open')
  @ApiOperation({ summary: 'Open a cashier register shift' })
  openShift(@Request() req: any, @Body() dto: OpenShiftDto) {
    const companyId = req.user.companyId;
    const employeeId = req.user.id;
    return this.shiftsService.openShift(companyId, employeeId, dto);
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Close a cashier register shift' })
  closeShift(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: CloseShiftDto,
  ) {
    const companyId = req.user.companyId;
    const employeeId = req.user.id;
    return this.shiftsService.closeShift(id, companyId, employeeId, dto);
  }

  @Get(':id/report')
  @ApiOperation({ summary: 'Get detailed shift report' })
  getShiftReport(@Param('id') id: string, @Request() req: any) {
    return this.shiftsService.getShiftReport(id, req.user.companyId);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get current active shift for user' })
  @ApiQuery({ name: 'storeId', required: true })
  getActive(@Request() req: any, @Query('storeId') storeId: string) {
    const companyId = req.user.companyId;
    const employeeId = req.user.id;
    return this.shiftsService.getActiveShift(companyId, employeeId, storeId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all shifts history for a store' })
  @ApiQuery({ name: 'storeId', required: false })
  findAll(@Request() req: any, @Query('storeId') storeId?: string) {
    return this.shiftsService.findAll(req.user.companyId, storeId);
  }
}
