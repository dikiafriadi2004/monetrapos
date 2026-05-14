import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Request,
  UseGuards,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MemberJwtGuard } from '../auth/guards/member-jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { StorageService } from '../../common/utils/storage.service';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto, UpdateCompanySettingsDto } from './dto';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(MemberJwtGuard)
@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly storageService: StorageService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current company profile' })
  getProfile(@Request() req: any) {
    const companyId = req.user.companyId || req.user.company_id;
    return this.companiesService.getProfile(companyId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update company profile' })
  updateProfile(@Request() req: any, @Body() dto: UpdateCompanyDto) {
    const companyId = req.user.companyId || req.user.company_id;
    return this.companiesService.updateProfile(companyId, dto);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get company settings' })
  getSettings(@Request() req: any) {
    const companyId = req.user.companyId || req.user.company_id;
    return this.companiesService.getSettings(companyId);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update company settings' })
  updateSettings(@Request() req: any, @Body() dto: UpdateCompanySettingsDto) {
    const companyId = req.user.companyId || req.user.company_id;
    return this.companiesService.updateSettings(companyId, dto);
  }

  @Get('notification-settings')
  @ApiOperation({ summary: 'Get notification settings' })
  async getNotificationSettings(@Request() req: any) {
    const companyId = req.user.companyId || req.user.company_id;
    const company = await this.companiesService.getProfile(companyId);
    return company.metadata?.notificationSettings || {};
  }

  @Patch('notification-settings')
  @ApiOperation({ summary: 'Update notification settings' })
  async updateNotificationSettings(@Request() req: any, @Body() dto: Record<string, any>) {
    const companyId = req.user.companyId || req.user.company_id;
    const company = await this.companiesService.getProfile(companyId);
    const updatedMetadata = {
      ...company.metadata,
      notificationSettings: { ...(company.metadata?.notificationSettings || {}), ...dto },
    };
    return this.companiesService.updateProfile(companyId, { metadata: updatedMetadata } as any);
  }

  @Get('integrations')
  @ApiOperation({ summary: 'Get integration configurations' })
  async getIntegrations(@Request() req: any) {
    const companyId = req.user.companyId || req.user.company_id;
    const company = await this.companiesService.getProfile(companyId);
    return company.metadata?.integrations || {};
  }

  @Patch('integrations')
  @ApiOperation({ summary: 'Save integration configuration' })
  async updateIntegrations(@Request() req: any, @Body() dto: Record<string, any>) {
    const companyId = req.user.companyId || req.user.company_id;
    const company = await this.companiesService.getProfile(companyId);
    const updatedMetadata = {
      ...company.metadata,
      integrations: { ...(company.metadata?.integrations || {}), ...dto },
    };
    await this.companiesService.updateProfile(companyId, { metadata: updatedMetadata } as any);
    return updatedMetadata.integrations;
  }

  @Post('integrations/:id/test')
  @ApiOperation({ summary: 'Test integration connection' })
  async testIntegration(@Param('id') integrationId: string, @Request() req: any) {
    const companyId = req.user.companyId || req.user.company_id;
    const company = await this.companiesService.getProfile(companyId);
    const cfg = company.metadata?.integrations?.[integrationId] || {};

    try {
      switch (integrationId) {
        case 'whatsapp': {
          if (!cfg.apiKey) return { success: false, message: 'API Key belum diisi' };
          // Test dengan mengirim pesan ke nomor pengirim sendiri
          const provider = cfg.provider || 'fonnte';
          if (provider === 'fonnte') {
            const res = await fetch('https://api.fonnte.com/send', {
              method: 'POST',
              headers: { Authorization: cfg.apiKey, 'Content-Type': 'application/json' },
              body: JSON.stringify({ target: cfg.senderNumber || '628000000000', message: 'Test koneksi MonetraPOS ✅', countryCode: '62' }),
            });
            const data = await res.json() as any;
            return data.status ? { success: true, message: 'Koneksi WhatsApp (Fonnte) berhasil!' } : { success: false, message: data.reason || 'Gagal' };
          }
          return { success: true, message: 'Konfigurasi disimpan. Silakan test manual dengan mengirim pesan.' };
        }
        case 'jurnal': {
          if (!cfg.clientId || !cfg.clientSecret) return { success: false, message: 'Client ID dan Secret belum diisi' };
          return { success: true, message: 'Konfigurasi Jurnal.id disimpan. Sinkronisasi akan berjalan sesuai mode yang dipilih.' };
        }
        case 'accurate': {
          if (!cfg.clientId || !cfg.clientSecret) return { success: false, message: 'Client ID dan Secret belum diisi' };
          return { success: true, message: 'Konfigurasi Accurate Online disimpan.' };
        }
        case 'tokopedia':
        case 'shopee': {
          if (!cfg.clientId) return { success: false, message: 'Client ID belum diisi' };
          return { success: true, message: `Konfigurasi ${integrationId} disimpan. Sinkronisasi stok akan aktif.` };
        }
        case 'gofood':
        case 'grabfood':
        case 'shopeefood': {
          if (!cfg.merchantId || !cfg.apiKey) return { success: false, message: 'Merchant ID dan API Key belum diisi' };
          return { success: true, message: `Konfigurasi ${integrationId} disimpan. Pesanan akan masuk otomatis.` };
        }
        default:
          return { success: true, message: 'Konfigurasi disimpan.' };
      }
    } catch (err: any) {
      return { success: false, message: `Error: ${err.message}` };
    }
  }

  @Post('upload-logo')
  @ApiOperation({ summary: 'Upload company logo' })
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    fileFilter: (req, file, cb) => {
      const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
      if (!allowed.includes(extname(file.originalname).toLowerCase())) {
        return cb(new BadRequestException('Only image files allowed'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  async uploadLogo(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const companyId = req.user.companyId || req.user.company_id;
    const ext = extname(file.originalname).toLowerCase();
    const filename = `logo-${Date.now()}${ext}`;

    // Delete old logo
    const company = await this.companiesService.getProfile(companyId);
    if ((company as any).logoUrl) {
      await this.storageService.deleteFile((company as any).logoUrl);
    }

    const logoUrl = await this.storageService.uploadFile(file.buffer, filename, 'logos', file.mimetype);
    await this.companiesService.updateProfile(companyId, { logoUrl } as any);
    return { logoUrl };
  }
}
