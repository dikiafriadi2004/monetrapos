import { Controller, Get, Patch, Body, Request, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current company profile' })
  getProfile(@Request() req) {
    if (req.user.type !== 'company_admin') {
      throw new UnauthorizedException('Only company admins can access this endpoint');
    }
    return this.companiesService.getProfile(req.user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update company profile' })
  updateProfile(@Request() req, @Body() dto: UpdateCompanyDto) {
    if (req.user.type !== 'company_admin') {
      throw new UnauthorizedException('Only company admins can access this endpoint');
    }
    return this.companiesService.updateProfile(req.user.id, dto);
  }
}
