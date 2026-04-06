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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { CompaniesService } from './companies.service';
import { UpdateCompanyStatusDto, CompanyFilterDto } from './dto';

class CreateMemberDto {
  @IsString() @MinLength(2) name: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() businessName?: string;
  @IsString() @MinLength(6) password: string;
}

@ApiTags('Admin - Member Management')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/companies')
export class AdminCompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @ApiOperation({ summary: 'Create member company (admin)' })
  @HttpCode(HttpStatus.CREATED)
  async createMember(@Body() dto: CreateMemberDto) {
    return this.companiesService.createMemberByAdmin(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update member company info' })
  @HttpCode(HttpStatus.OK)
  async updateMember(@Param('id') id: string, @Body() dto: Partial<CreateMemberDto>) {
    return this.companiesService.updateMemberByAdmin(id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all member companies' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'suspended', 'cancelled', 'pending'] })
  @ApiQuery({ name: 'businessType', required: false, type: String })
  @ApiQuery({ name: 'subscriptionStatus', required: false, type: String })
  @HttpCode(HttpStatus.OK)
  async listMembers(@Query() filters: CompanyFilterDto) {
    return this.companiesService.findAllMembers(filters);
  }

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Get member analytics overview' })
  @HttpCode(HttpStatus.OK)
  async getMemberAnalytics() {
    return this.companiesService.getMemberAnalytics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get member company details' })
  @HttpCode(HttpStatus.OK)
  async getMemberDetails(@Param('id') id: string) {
    return this.companiesService.getMemberDetails(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update member company status' })
  @HttpCode(HttpStatus.OK)
  async updateMemberStatus(@Param('id') id: string, @Body() dto: UpdateCompanyStatusDto) {
    return this.companiesService.updateMemberStatus(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete member company' })
  @HttpCode(HttpStatus.OK)
  async deleteMember(@Param('id') id: string) {
    return this.companiesService.softDeleteMember(id);
  }
}
