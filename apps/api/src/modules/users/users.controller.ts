import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UserRole } from './user.entity';

// TODO: Import actual guards when auth module is updated
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';

@Controller('users')
// @UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  // @Roles(UserRole.OWNER, UserRole.ADMIN)
  async create(
    @Body()
    body: {
      name: string;
      email: string;
      password: string;
      role?: UserRole;
      phone?: string;
    },
    @Request() req: any,
  ) {
    // TODO: Get companyId from authenticated user
    const companyId = req.user?.companyId || 'temp-company-id';

    return this.usersService.create({
      companyId,
      ...body,
    });
  }

  @Get()
  async findAll(@Request() req: any) {
    // TODO: Get companyId from authenticated user
    const companyId = req.user?.companyId || 'temp-company-id';

    return this.usersService.findAll(companyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    // TODO: Get companyId from authenticated user
    const companyId = req.user?.companyId || 'temp-company-id';

    return this.usersService.findOne(id, companyId);
  }

  @Put(':id')
  // @Roles(UserRole.OWNER, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      email: string;
      phone: string;
      role: UserRole;
      permissions: string[];
      isActive: boolean;
    }>,
    @Request() req: any,
  ) {
    // TODO: Get companyId from authenticated user
    const companyId = req.user?.companyId || 'temp-company-id';

    return this.usersService.update(id, companyId, body);
  }

  @Put(':id/password')
  async updatePassword(
    @Param('id') id: string,
    @Body() body: { newPassword: string },
    @Request() req: any,
  ) {
    // TODO: Get companyId from authenticated user
    const companyId = req.user?.companyId || 'temp-company-id';

    await this.usersService.updatePassword(id, companyId, body.newPassword);
    return { message: 'Password updated successfully' };
  }

  @Delete(':id')
  // @Roles(UserRole.OWNER, UserRole.ADMIN)
  async remove(@Param('id') id: string, @Request() req: any) {
    // TODO: Get companyId from authenticated user
    const companyId = req.user?.companyId || 'temp-company-id';

    await this.usersService.remove(id, companyId);
    return { message: 'User deleted successfully' };
  }
}
