import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Request,
  UseGuards,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MemberJwtGuard } from '../auth/guards/member-jwt.guard';
import { MembersService } from './members.service';
import { CreateMemberDto, UpdateMemberDto } from './dto';

@ApiTags('Members')
@ApiBearerAuth()
@UseGuards(MemberJwtGuard)
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get('profile/me')
  @ApiOperation({ summary: 'Get current member profile' })
  getProfile(@Request() req: any) {
    return this.membersService.getProfile(req.user.id);
  }

  @Patch('profile/me')
  @ApiOperation({ summary: 'Update member profile' })
  updateProfile(@Request() req: any, @Body() dto: UpdateMemberDto) {
    return this.membersService.updateProfile(req.user.id, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new member under this company' })
  create(@Request() req: any, @Body() dto: CreateMemberDto) {
    dto.companyId = req.user.companyId;
    return this.membersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all members under this company' })
  findAll(@Request() req: any) {
    return this.membersService.findAllByCompany(req.user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific member by ID' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.membersService.findOneByCompany(req.user.companyId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a specific member' })
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membersService.updateByCompany(req.user.companyId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a specific member' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.membersService.removeByCompany(req.user.companyId, id);
  }
}
