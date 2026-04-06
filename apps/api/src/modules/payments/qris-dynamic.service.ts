import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as QRCode from 'qrcode';

/**
 * QRIS Dinamis Service
 *
 * Cara kerja:
 * 1. Merchant upload QRIS statis (gambar) → backend parse string EMV dari QR
 * 2. Saat transaksi, backend ambil string EMV, inject nominal, hitung ulang CRC
 * 3. Generate QR code baru sebagai base64 image → kirim ke frontend
 *
 * Format QRIS mengikuti standar EMV QRCPS (ISO 20022)
 * Field 54 = Transaction Amount
 * Field 63 = CRC (4 digit hex, CRC-16/CCITT-FALSE)
 */
@Injectable()
export class QrisDynamicService {
  private readonly logger = new Logger(QrisDynamicService.name);

  /**
   * Parse QR string dari gambar QRIS statis menggunakan jsQR atau manual decode
   * Karena kita tidak bisa decode gambar di backend tanpa canvas,
   * parsedData harus diisi saat upload (dari frontend yang bisa decode QR)
   */
  parseQrisString(qrisString: string): {
    isValid: boolean;
    merchantName?: string;
    merchantId?: string;
    fields: Record<string, string>;
  } {
    try {
      const fields = this.parseEMV(qrisString);
      return {
        isValid: true,
        merchantName: fields['59'] || fields['26']?.substring(0, 25),
        merchantId: fields['00'],
        fields,
      };
    } catch {
      return { isValid: false, fields: {} };
    }
  }

  /**
   * Generate QRIS dinamis dengan nominal tertentu
   * @param qrisString - String EMV QRIS statis (dari parsedData)
   * @param amount - Nominal transaksi dalam IDR
   * @returns base64 PNG image dari QR code
   */
  async generateDynamicQris(qrisString: string, amount: number): Promise<string> {
    if (!qrisString || !qrisString.trim()) {
      throw new BadRequestException('QRIS string tidak tersedia. Upload QRIS statis terlebih dahulu.');
    }

    try {
      // Inject nominal ke QRIS string
      const dynamicQrisString = this.injectAmount(qrisString.trim(), amount);

      // Generate QR code sebagai base64 PNG
      const qrDataUrl = await QRCode.toDataURL(dynamicQrisString, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });

      this.logger.log(`QRIS dinamis generated untuk nominal Rp ${amount.toLocaleString('id-ID')}`);
      return qrDataUrl; // format: "data:image/png;base64,..."
    } catch (err: any) {
      this.logger.error(`Gagal generate QRIS dinamis: ${err.message}`);
      throw new BadRequestException(`Gagal generate QRIS: ${err.message}`);
    }
  }

  /**
   * Inject nominal ke dalam string EMV QRIS
   * - Hapus field 54 (amount) yang lama jika ada
   * - Tambahkan field 54 baru dengan nominal
   * - Recalculate CRC (field 63)
   */
  private injectAmount(qrisString: string, amount: number): string {
    // Format amount: integer IDR tanpa desimal (misal: "15000")
    const amountStr = Math.round(amount).toString();

    // Parse semua field
    let result = '';
    let i = 0;
    let hasAmount = false;

    while (i < qrisString.length - 4) { // -4 untuk CRC di akhir
      const tag = qrisString.substring(i, i + 2);
      const len = parseInt(qrisString.substring(i + 2, i + 4), 10);
      const value = qrisString.substring(i + 4, i + 4 + len);

      if (tag === '54') {
        // Replace amount field
        const newLen = amountStr.length.toString().padStart(2, '0');
        result += `54${newLen}${amountStr}`;
        hasAmount = true;
      } else if (tag === '63') {
        // Skip CRC — akan dihitung ulang
        break;
      } else {
        result += `${tag}${qrisString.substring(i + 2, i + 4)}${value}`;
      }

      i += 4 + len;
    }

    // Jika tidak ada field 54, tambahkan sebelum CRC
    if (!hasAmount) {
      const newLen = amountStr.length.toString().padStart(2, '0');
      result += `54${newLen}${amountStr}`;
    }

    // Tambahkan field 63 (CRC placeholder) — CRC dihitung dari seluruh string + "6304"
    result += '6304';

    // Hitung CRC-16/CCITT-FALSE
    const crc = this.crc16(result);
    result += crc.toString(16).toUpperCase().padStart(4, '0');

    return result;
  }

  /**
   * Parse EMV TLV (Tag-Length-Value) string
   */
  private parseEMV(qrisString: string): Record<string, string> {
    const fields: Record<string, string> = {};
    let i = 0;

    while (i < qrisString.length) {
      if (i + 4 > qrisString.length) break;
      const tag = qrisString.substring(i, i + 2);
      const lenStr = qrisString.substring(i + 2, i + 4);
      const len = parseInt(lenStr, 10);

      if (isNaN(len) || i + 4 + len > qrisString.length) break;

      const value = qrisString.substring(i + 4, i + 4 + len);
      fields[tag] = value;
      i += 4 + len;
    }

    return fields;
  }

  /**
   * CRC-16/CCITT-FALSE algorithm
   * Polynomial: 0x1021, Initial value: 0xFFFF
   */
  private crc16(data: string): number {
    let crc = 0xffff;
    for (let i = 0; i < data.length; i++) {
      crc ^= data.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc <<= 1;
        }
        crc &= 0xffff;
      }
    }
    return crc;
  }
}
