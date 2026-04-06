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
import { MemberJwtGuard } from '../auth/guards/member-jwt.guard';
import { UsersService } from './users.service';
import { UserRole } from './user.entity';

@Controller('users')
@UseGuards(MemberJwtGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
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
    const companyId = req.user.companyId || req.user.company_id;
    return this.usersService.create({ companyId, ...body });
  }

  @Get()
  async findAll(@Request() req: any) {
    return this.usersService.findAll(req.user.companyId || req.user.company_id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.usersService.findOne(id, req.user.companyId || req.user.company_id);
  }

  @Put(':id')
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
    return this.usersService.update(id, req.user.companyId || req.user.company_id, body);
  }

  @Put(':id/password')
  async updatePassword(
    @Param('id') id: string,
    @Body() body: { newPassword: string },
    @Request() req: any,
  ) {
    await this.usersService.updatePassword(id, req.user.companyId || req.user.company_id, body.newPassword);
    return { message: 'Password updated successfully' };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    await this.usersService.remove(id, req.user.companyId || req.user.company_id);
    return { message: 'User deleted successfully' };
  }
}
