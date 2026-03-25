import { Controller, Get, Patch, Body, Request, UseGuards, Param, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MembersService } from './members.service';
import { UpdateMemberDto } from './dto/update-member.dto';

@ApiTags('Members')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  // 1. Member Endpoints
  @Get('profile/me')
  @ApiOperation({ summary: 'Get current member profile' })
  getProfile(@Request() req) {
    if (req.user.type !== 'member') {
      throw new UnauthorizedException('Only members can access their profile directly');
    }
    return this.membersService.getProfile(req.user.id);
  }

  @Patch('profile/me')
  @ApiOperation({ summary: 'Update member profile' })
  updateProfile(@Request() req, @Body() dto: UpdateMemberDto) {
    if (req.user.type !== 'member') {
      throw new UnauthorizedException('Only members can update their own profile');
    }
    return this.membersService.updateProfile(req.user.id, dto);
  }

  // 2. Company Admin Endpoints
  @Get()
  @ApiOperation({ summary: 'List all members under this company' })
  findAll(@Request() req) {
    if (req.user.type !== 'company_admin') {
      throw new UnauthorizedException('Only company admins can access this list');
    }
    return this.membersService.findAllByCompany(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific member by ID' })
  findOne(@Request() req, @Param('id') id: string) {
    if (req.user.type !== 'company_admin') {
      throw new UnauthorizedException('Only company admins can get member details');
    }
    return this.membersService.findOneByCompany(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a specific member' })
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateMemberDto) {
    if (req.user.type !== 'company_admin') {
      throw new UnauthorizedException('Only company admins can update members');
    }
    return this.membersService.updateByCompany(req.user.id, id, dto);
  }
}
