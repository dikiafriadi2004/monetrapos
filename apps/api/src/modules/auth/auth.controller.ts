import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto, RegisterCompanyDto, RegisterMemberDto, RefreshTokenDto } from './dto';
import { RequireRoles, RolesGuard } from './guards';
import { UserType } from '../../common/enums';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ────── Company Auth ──────

  @Post('company/register')
  @ApiOperation({ summary: 'Register a new company (platform owner)' })
  registerCompany(@Body() dto: RegisterCompanyDto) {
    return this.authService.registerCompany(dto);
  }

  @Post('company/login')
  @ApiOperation({ summary: 'Company admin login' })
  loginCompany(@Body() dto: LoginDto) {
    return this.authService.loginCompany(dto);
  }

  // ────── Member Auth ──────

  @Post('member/register')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @RequireRoles(UserType.COMPANY_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a new member (by company admin)' })
  registerMember(@Body() dto: RegisterMemberDto, @Request() req: any) {
    return this.authService.registerMember(dto, req.user.id);
  }

  @Post('member/login')
  @ApiOperation({ summary: 'Member login' })
  loginMember(@Body() dto: LoginDto) {
    return this.authService.loginMember(dto);
  }

  // ────── Employee Auth ──────

  @Post('employee/login')
  @ApiOperation({ summary: 'Employee/Cashier login' })
  loginEmployee(@Body() dto: LoginDto) {
    return this.authService.loginEmployee(dto);
  }

  // ────── Token Refresh ──────

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }
}
