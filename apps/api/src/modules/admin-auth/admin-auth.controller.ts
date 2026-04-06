import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminAuthService } from './admin-auth.service';
import { AdminJwtGuard } from './guards/admin-jwt.guard';
import { AdminRole } from './admin-user.entity';

@ApiTags('Admin - Auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin platform login' })
  async login(@Body('email') email: string, @Body('password') password: string, @Request() req: any) {
    const ip = req.ip || req.connection?.remoteAddress;
    return this.adminAuthService.login({ email, password }, ip);
  }

  @Get('me')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current admin profile' })
  async getMe(@Request() req: any) {
    return this.adminAuthService.getMe(req.user.id);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh admin access token' })
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.adminAuthService.refreshToken(refreshToken);
  }
}

@ApiTags('Admin - Settings')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/settings')
export class AdminSettingsUsersController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Get('users')
  @ApiOperation({ summary: 'List all admin users' })
  findAll() {
    return this.adminAuthService.findAll();
  }

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create admin user' })
  create(@Body() dto: { name: string; email: string; password: string; role?: AdminRole }) {
    return this.adminAuthService.create(dto);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update admin user' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.adminAuthService.update(id, dto);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete admin user' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.adminAuthService.remove(id, req.user.id);
  }
}
