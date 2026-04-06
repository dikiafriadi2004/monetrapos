import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { MemberJwtGuard } from '../auth/guards/member-jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { PaymentMethodsService } from './payment-methods.service';
import { PaymentsService } from '../payments/payments.service';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto } from './dto';
import { deleteOldFile } from '../../common/utils/file.utils';

@Controller('payment-methods')
@UseGuards(MemberJwtGuard)
export class PaymentMethodsController {
  private readonly logger = new Logger(PaymentMethodsController.name);

  constructor(
    private readonly paymentMethodsService: PaymentMethodsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * Get all payment methods for current company
   * GET /payment-methods
   */
  @Get()
  async findAll(@Request() req: any) {
    const companyId = req.user.companyId;
    return this.paymentMethodsService.findByCompany(companyId);
  }

  /**
   * Create a custom payment method
   * POST /payment-methods
   */
  @Post()
  async create(@Request() req: any, @Body() dto: CreatePaymentMethodDto) {
    const companyId = req.user.companyId;
    return this.paymentMethodsService.create({ ...dto, companyId });
  }

  /**
   * Update a payment method
   * PATCH /payment-methods/:id
   */
  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    const companyId = req.user.companyId;
    return this.paymentMethodsService.update(id, companyId, dto);
  }

  /**
   * Toggle payment method active status
   * PATCH /payment-methods/:id/toggle
   */
  @Patch(':id/toggle')
  async toggle(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.paymentMethodsService.toggle(id, companyId);
  }

  /**
   * Delete a payment method
   * DELETE /payment-methods/:id
   */
  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    await this.paymentMethodsService.delete(id, companyId);
    return { message: 'Payment method deleted successfully' };
  }

  /**
   * Upload QRIS image for a payment method
   * POST /payment-methods/:id/qris-image
   * Uploads static QRIS image and updates iconUrl
   */
  @Post(':id/qris-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = path.join(process.cwd(), 'uploads', 'qris');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase();
          cb(null, `qris-${Date.now()}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowed.includes(ext)) {
          return cb(new BadRequestException('Only image files allowed (jpg, jpeg, png, webp)'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadQrisImage(
    @Param('id') id: string,
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const companyId = req.user.companyId;
    const qrisImageUrl = `/uploads/qris/${file.filename}`;

    // Delete old QRIS image if exists
    const method = await this.paymentMethodsService.findById(id, companyId);
    if (method?.iconUrl) deleteOldFile(method.iconUrl);

    // Update payment method with new QRIS image URL
    const updated = await this.paymentMethodsService.update(id, companyId, {
      iconUrl: qrisImageUrl,
    } as any);

    // Auto-decode QR string dari gambar yang baru diupload
    let qrisDecoded = false;
    let qrisMessage = 'Gambar QRIS berhasil diupload.';
    try {
      const filePath = path.join(process.cwd(), qrisImageUrl);
      const { Jimp } = require('jimp');
      const image = await Jimp.read(filePath);
      const { data, width, height } = image.bitmap;
      const jsQR = require('jsqr');
      const code = jsQR(data, width, height);

      if (code?.data && code.data.startsWith('000201')) {
        await this.paymentsService.upsertQrisConfigByCompany(companyId, {
          parsedData: code.data,
          originalImage: code.data,
        });
        qrisDecoded = true;
        qrisMessage = '✅ Gambar QRIS diupload & QR string berhasil di-decode! QRIS Dinamis aktif.';
        this.logger.log(`QRIS auto-decoded for company ${companyId}, length: ${code.data.length}`);
      } else {
        qrisMessage = 'Gambar QRIS diupload. QR tidak bisa di-decode otomatis — gunakan "Input Manual" di halaman Payment Methods.';
      }
    } catch (err: any) {
      this.logger.warn(`QRIS auto-decode failed: ${err.message}`);
      qrisMessage = 'Gambar QRIS diupload. Decode otomatis gagal — gunakan "Input Manual".';
    }

    return {
      qrisImageUrl,
      qrisDecoded,
      message: qrisMessage,
      paymentMethod: updated,
    };
  }
}
