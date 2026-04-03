import {
  Controller,
  Get,
  Patch,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto, UpdateCompanySettingsDto } from './dto';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current company profile' })
  getProfile(@Request() req: any) {
    // Extract companyId from JWT token (set by tenant middleware)
    const companyId = req.user.companyId || req.user.company_id;
    return this.companiesService.getProfile(companyId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update company profile' })
  updateProfile(@Request() req: any, @Body() dto: UpdateCompanyDto) {
    // Extract companyId from JWT token (set by tenant middleware)
    const companyId = req.user.companyId || req.user.company_id;
    return this.companiesService.updateProfile(companyId, dto);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get company settings' })
  getSettings(@Request() req: any) {
    const companyId = req.user.companyId || req.user.company_id;
    return this.companiesService.getSettings(companyId);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update company settings' })
  updateSettings(@Request() req: any, @Body() dto: UpdateCompanySettingsDto) {
    const companyId = req.user.companyId || req.user.company_id;
    return this.companiesService.updateSettings(companyId, dto);
  }
}
