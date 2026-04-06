import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterCompanyDto,
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
  @ApiOperation({ summary: 'Login employee' })
  async loginEmployee(@Body() dto: LoginDto) {
    return this.authService.loginEmployee(dto);
  }

  @Get('me')
  @UseGuards(MemberJwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@Request() req) {
    return this.authService.getMe(req.user.id);
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
