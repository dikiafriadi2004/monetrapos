import { Controller, Get, Post, Body, Patch, Param, Delete, Request, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SubscriptionsService } from './subscriptions.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@ApiTags('Subscription Plans')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('subscriptions/plans')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new subscription plan' })
  createPlan(@Request() req, @Body() dto: CreatePlanDto) {
    if (req.user.type !== 'company_admin') {
      throw new UnauthorizedException('Only company admins can manage plans');
    }
    return this.subscriptionsService.createPlan(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all subscription plans' })
  findAllPlans(@Request() req) {
    if (req.user.type !== 'company_admin') {
      throw new UnauthorizedException('Only company admins can manage plans');
    }
    return this.subscriptionsService.findAllPlans(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific subscription plan' })
  findOnePlan(@Request() req, @Param('id') id: string) {
    if (req.user.type !== 'company_admin') {
      throw new UnauthorizedException('Only company admins can manage plans');
    }
    return this.subscriptionsService.findOnePlan(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a subscription plan' })
  updatePlan(@Request() req, @Param('id') id: string, @Body() dto: UpdatePlanDto) {
    if (req.user.type !== 'company_admin') {
      throw new UnauthorizedException('Only company admins can manage plans');
    }
    return this.subscriptionsService.updatePlan(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a subscription plan' })
  removePlan(@Request() req, @Param('id') id: string) {
    if (req.user.type !== 'company_admin') {
      throw new UnauthorizedException('Only company admins can manage plans');
    }
    return this.subscriptionsService.removePlan(req.user.id, id);
  }
}
