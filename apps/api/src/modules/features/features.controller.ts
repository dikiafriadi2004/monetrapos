import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { FeaturesService } from './features.service';
import { CreateFeatureDto, UpdateFeatureDto } from './dto';

@ApiTags('Platform Features')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/features')
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new platform feature' })
  create(@Body() dto: CreateFeatureDto) {
    return this.featuresService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all platform features' })
  findAll() {
    return this.featuresService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific feature' })
  findOne(@Param('id') id: string) {
    return this.featuresService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a feature' })
  update(@Param('id') id: string, @Body() dto: UpdateFeatureDto) {
    return this.featuresService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a feature' })
  remove(@Param('id') id: string) {
    return this.featuresService.remove(id);
  }
}
