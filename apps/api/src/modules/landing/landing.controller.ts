import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { LandingService } from './landing.service';
import { LandingContent } from './landing-content.entity';

@ApiTags('Landing')
@Controller('landing')
export class LandingController {
  constructor(private readonly landingService: LandingService) {}

  /**
   * PUBLIC — Get all visible landing page content
   * GET /api/v1/landing
   */
  @Get()
  @ApiOperation({ summary: 'Get all visible landing page content (public)' })
  async getPublicContent(): Promise<Record<string, any>> {
    return this.landingService.getPublicContent();
  }

  /**
   * PUBLIC — Get single section content
   * GET /api/v1/landing/:section
   */
  @Get(':section')
  @ApiOperation({ summary: 'Get single section content (public)' })
  async getSection(@Param('section') section: string): Promise<LandingContent> {
    return this.landingService.getSection(section);
  }

  /**
   * ADMIN — Get all sections including hidden
   * GET /api/v1/landing/admin/all
   */
  @Get('admin/all')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all sections for admin' })
  async getAllSections(): Promise<LandingContent[]> {
    return this.landingService.getAllSections();
  }

  /**
   * ADMIN — Update section content
   * PATCH /api/v1/landing/admin/:section
   */
  @Patch('admin/:section')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update section content' })
  async updateSection(
    @Param('section') section: string,
    @Body()
    body: {
      content?: Record<string, any>;
      isVisible?: boolean;
      sortOrder?: number;
      title?: string;
    },
  ): Promise<LandingContent> {
    return this.landingService.updateSection(section, body);
  }

  /**
   * ADMIN — Seed default content
   * POST /api/v1/landing/admin/seed
   */
  @Post('admin/seed')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Seed default landing page content' })
  async seedDefaults(): Promise<{ message: string }> {
    await this.landingService.seedDefaults();
    return { message: 'Default content seeded successfully' };
  }
}
