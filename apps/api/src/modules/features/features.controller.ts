import { Controller, Get, Post, Body, Patch, Param, Delete, Request, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FeaturesService } from './features.service';
import { CreateFeatureDto, UpdateFeatureDto } from './dto';

@ApiTags('Marketplace Features')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('features')
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new feature for the marketplace' })
  create(@Request() req: any, @Body() dto: CreateFeatureDto) {
    if (req.user.type !== 'company_admin') {
      throw new UnauthorizedException('Only company admins can manage features');
    }
    return this.featuresService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all features' })
  findAll(@Request() req: any) {
    if (req.user.type !== 'company_admin') {
      throw new UnauthorizedException('Only company admins can manage features');
    }
    return this.featuresService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific feature' })
  findOne(@Request() req: any, @Param('id') id: string) {
    if (req.user.type !== 'company_admin') {
      throw new UnauthorizedException('Only company admins can manage features');
    }
    return this.featuresService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a feature' })
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateFeatureDto) {
    if (req.user.type !== 'company_admin') {
      throw new UnauthorizedException('Only company admins can manage features');
    }
    return this.featuresService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a feature' })
  remove(@Request() req: any, @Param('id') id: string) {
    if (req.user.type !== 'company_admin') {
      throw new UnauthorizedException('Only company admins can manage features');
    }
    return this.featuresService.remove(req.user.id, id);
  }
}
