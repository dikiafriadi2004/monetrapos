import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { MemberJwtGuard } from '../auth/guards/member-jwt.guard';
import { PermissionGuard, RequirePermissions } from '../auth/guards';
import { PaymentsService } from './payments.service';
import { QrisDynamicService } from './qris-dynamic.service';
import {
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
  CreateQrisConfigDto,
  UpdateQrisConfigDto,
} from './dto';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(MemberJwtGuard, PermissionGuard)
@Controller()
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly qrisDynamicService: QrisDynamicService,
  ) {}

  // ────── Payment Methods ──────

  @Post('payment-methods')
  @RequirePermissions('finance.manage_payment')
  @ApiOperation({ summary: 'Create a payment method' })
  createPaymentMethod(@Body() dto: CreatePaymentMethodDto) {
    return this.paymentsService.createPaymentMethod(dto);
  }

  @Get('payment-methods')
  @ApiOperation({ summary: 'Get all payment methods for a store' })
  @ApiQuery({ name: 'storeId', required: true })
  findAllPaymentMethods(@Query('storeId') storeId: string) {
    return this.paymentsService.findAllPaymentMethods(storeId);
  }

  @Get('payment-methods/active')
  @ApiOperation({ summary: 'Get active payment methods for a store' })
  @ApiQuery({ name: 'storeId', required: true })
  findActivePaymentMethods(@Query('storeId') storeId: string) {
    return this.paymentsService.findActivePaymentMethods(storeId);
  }

  @Get('payment-methods/:id')
  @ApiOperation({ summary: 'Get payment method by ID' })
  findOnePaymentMethod(@Param('id') id: string) {
    return this.paymentsService.findOnePaymentMethod(id);
  }

  @Patch('payment-methods/:id')
  @RequirePermissions('finance.manage_payment')
  @ApiOperation({ summary: 'Update payment method' })
  updatePaymentMethod(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.paymentsService.updatePaymentMethod(id, dto);
  }

  @Delete('payment-methods/:id')
  @RequirePermissions('finance.manage_payment')
  @ApiOperation({ summary: 'Delete payment method' })
  removePaymentMethod(@Param('id') id: string) {
    return this.paymentsService.removePaymentMethod(id);
  }

  // ────── QRIS Config ──────

  @Post('qris')
  @RequirePermissions('finance.manage_payment')
  @ApiOperation({ summary: 'Upload and configure QRIS' })
  createQrisConfig(@Body() dto: CreateQrisConfigDto) {
    return this.paymentsService.createQrisConfig(dto);
  }

  @Get('qris')
  @ApiOperation({ summary: 'Get QRIS configurations for a store' })
  @ApiQuery({ name: 'storeId', required: true })
  findQrisConfigs(@Query('storeId') storeId: string) {
    return this.paymentsService.findQrisConfigByStore(storeId);
  }

  @Get('qris/active')
  @ApiOperation({ summary: 'Get active QRIS config for a store' })
  @ApiQuery({ name: 'storeId', required: true })
  findActiveQris(@Query('storeId') storeId: string) {
    return this.paymentsService.findActiveQrisConfig(storeId);
  }

  @Patch('qris/:id')
  @RequirePermissions('finance.manage_payment')
  @ApiOperation({ summary: 'Update QRIS config' })
  updateQrisConfig(@Param('id') id: string, @Body() dto: UpdateQrisConfigDto) {
    return this.paymentsService.updateQrisConfig(id, dto);
  }

  @Delete('qris/:id')
  @RequirePermissions('finance.manage_payment')
  @ApiOperation({ summary: 'Delete QRIS config' })
  removeQrisConfig(@Param('id') id: string) {
    return this.paymentsService.removeQrisConfig(id);
  }

  /**
   * POST /qris/generate-dynamic
   * Generate QRIS dinamis dengan nominal tertentu
   * Terima storeId ATAU companyId
   */
  @Post('qris/generate-dynamic')
  @ApiOperation({ summary: 'Generate dynamic QRIS with specific amount' })
  async generateDynamicQris(
    @Body() body: { storeId?: string; companyId?: string; amount: number },
    @Request() req: any,
  ) {
    // Gunakan companyId dari token jika tidak dikirim
    const companyId = body.companyId || req.user?.companyId;

    let qrisConfig: import('./qris-config.entity').QrisConfig | null = null;

    // Cari by storeId dulu
    if (body.storeId) {
      qrisConfig = await this.paymentsService.findActiveQrisConfig(body.storeId);
    }
    // Fallback ke companyId
    if (!qrisConfig && companyId) {
      qrisConfig = await this.paymentsService.findActiveQrisConfigByCompany(companyId);
    }

    if (!qrisConfig) {
      return {
        success: false,
        message: 'QRIS belum dikonfigurasi. Upload gambar QRIS di Settings → Payment Methods.',
        qrDataUrl: null,
      };
    }

    if (!qrisConfig.parsedData) {
      return {
        success: false,
        message: 'QRIS string tidak tersedia. Upload ulang gambar QRIS agar sistem bisa decode QR string.',
        qrDataUrl: null,
      };
    }

    try {
      const qrDataUrl = await this.qrisDynamicService.generateDynamicQris(
        qrisConfig.parsedData,
        body.amount,
      );
      return {
        success: true,
        qrDataUrl,
        merchantName: qrisConfig.merchantName,
        amount: body.amount,
      };
    } catch (err: any) {
      return { success: false, message: err.message, qrDataUrl: null };
    }
  }

  /**
   * POST /qris/auto-setup
   * Auto-decode semua QRIS image yang sudah ada untuk company ini
   * Dipanggil otomatis saat halaman payment methods dibuka
   */
  @Post('qris/auto-setup')
  @ApiOperation({ summary: 'Auto decode QRIS from existing payment method images' })
  async autoSetupQris(@Request() req: any) {
    const companyId = req.user?.companyId;
    if (!companyId) return { success: false };

    // Cek apakah sudah ada config
    const existing = await this.paymentsService.findActiveQrisConfigByCompany(companyId);
    if (existing?.parsedData) return { success: true, alreadyConfigured: true };

    // Cari payment method QRIS yang punya iconUrl
    const { PaymentMethod } = require('../payment-methods/payment-method.entity');
    const pmRepo = req.app?.get ? null : null; // tidak bisa inject di sini, gunakan cara lain

    return { success: false, message: 'Use /qris/decode-from-image endpoint instead' };
  }

  /**
   * POST /qris/decode-from-image
   * Decode QR string dari gambar yang sudah ada di server
   */
  @Post('qris/decode-from-image')
  @ApiOperation({ summary: 'Decode QRIS string from uploaded image and save config' })
  async decodeQrisFromImage(
    @Body() body: { iconUrl: string },
    @Request() req: any,
  ) {
    const companyId = req.user?.companyId;
    if (!companyId) return { success: false, message: 'Company not found' };
    if (!body.iconUrl) return { success: false, message: 'iconUrl required' };

    try {
      // Resolve path dari iconUrl (misal: /uploads/qris/qris-xxx.jpg)
      const filePath = require('path').join(process.cwd(), body.iconUrl);

      if (!require('fs').existsSync(filePath)) {
        return { success: false, message: `File tidak ditemukan: ${body.iconUrl}` };
      }

      // Baca gambar dengan jimp
      const { Jimp } = require('jimp');
      const image = await Jimp.read(filePath);
      const { data, width, height } = image.bitmap;

      // Decode QR dengan jsqr
      const jsQR = require('jsqr');
      const code = jsQR(data, width, height);

      if (!code || !code.data) {
        return {
          success: false,
          message: 'Tidak bisa decode QR dari gambar. Pastikan gambar QRIS jelas, tidak blur, dan tidak terpotong. Atau gunakan "Input Manual" untuk paste QRIS string.',
        };
      }

      const qrisString = code.data;

      // Validasi format QRIS
      if (!qrisString.startsWith('000201')) {
        return {
          success: false,
          message: `QR berhasil dibaca tapi bukan format QRIS (${qrisString.substring(0, 20)}...). Pastikan gambar adalah QRIS merchant.`,
        };
      }

      // Simpan ke qris_configs
      await this.paymentsService.upsertQrisConfigByCompany(companyId, {
        parsedData: qrisString,
        originalImage: qrisString,
      });

      return {
        success: true,
        message: 'QRIS string berhasil di-decode dan disimpan! QRIS Dinamis aktif.',
        preview: qrisString.substring(0, 40) + '...',
        length: qrisString.length,
      };
    } catch (err: any) {
      return { success: false, message: `Error: ${err.message}` };
    }
  }
  @Get('qris/config/company/status')
  @ApiOperation({ summary: 'Check QRIS config status for current company' })
  async getQrisConfigStatus(@Request() req: any) {
    const companyId = req.user?.companyId;
    if (!companyId) return { exists: false };
    const config = await this.paymentsService.findActiveQrisConfigByCompany(companyId);
    return {
      exists: !!config,
      merchantName: config?.merchantName || null,
      hasString: !!(config?.parsedData),
    };
  }

  /**
   * POST /qris/config/company
   * Simpan QRIS config by companyId (dipanggil saat upload QRIS di settings)
   */
  @Post('qris/config/company')
  @ApiOperation({ summary: 'Save QRIS config by companyId' })
  async saveQrisConfigByCompany(
    @Body() body: { parsedData: string; originalImage?: string; merchantName?: string },
    @Request() req: any,
  ) {
    const companyId = req.user?.companyId;
    if (!companyId) return { success: false, message: 'Company not found' };
    const config = await this.paymentsService.upsertQrisConfigByCompany(companyId, body);
    return { success: true, config };
  }
}
