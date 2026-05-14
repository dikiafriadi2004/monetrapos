import { Controller, Post, Get, Patch, Body, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterCompanyDto,
  RegisterSimpleDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MemberJwtGuard } from './guards/member-jwt.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new company' })
  async register(@Body() dto: RegisterCompanyDto) {
    return this.authService.registerCompany(dto);
  }

  @Post('register/simple')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Simple registration with automatic 14-day trial' })
  async registerSimple(@Body() dto: RegisterSimpleDto) {
    return this.authService.registerSimple(dto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('login/employee')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login employee with email & password' })
  async loginEmployee(@Body() dto: LoginDto) {
    return this.authService.loginEmployee(dto);
  }

  @Post('login/pin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login employee with PIN (quick login for cashier)' })
  async loginPin(@Body() body: { pin: string; storeId?: string }) {
    return this.authService.loginByPin(body.pin, body.storeId);
  }

  @Get('me')
  @UseGuards(MemberJwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@Request() req) {
    // Handle both member and employee tokens
    if (req.user.type === 'employee') {
      return this.authService.getMeEmployee(req.user.id);
    }
    return this.authService.getMe(req.user.id);
  }

  @Patch('profile')
  @UseGuards(MemberJwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update own profile or change password' })
  async updateProfile(
    @Request() req,
    @Body() dto: { name?: string; currentPassword?: string; newPassword?: string; pin?: string },
  ) {
    return this.authService.updateProfile(req.user.id, req.user.companyId, dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }
}
