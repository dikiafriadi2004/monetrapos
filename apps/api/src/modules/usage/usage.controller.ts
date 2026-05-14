import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MemberJwtGuard } from '../auth/guards/member-jwt.guard';
import { UsageService } from './usage.service';

@ApiTags('Usage')
@ApiBearerAuth()
@UseGuards(MemberJwtGuard)
@Controller('usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  @ApiOperation({ summary: 'Get usage summary for current company' })
  async getUsageSummary(@Request() req: any) {
    const companyId = req.user.companyId;
    return this.usageService.getUsageSummary(companyId);
  }
}
