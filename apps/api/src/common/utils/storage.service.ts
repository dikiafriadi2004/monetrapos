import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * StorageService — abstraksi untuk file upload.
 * - Jika AWS_S3_BUCKET dikonfigurasi → upload ke S3
 * - Jika tidak → simpan ke local disk (default)
 *
 * Cara aktifkan S3:
 * 1. npm install @aws-sdk/client-s3 @aws-sdk/lib-storage
 * 2. Set env vars: AWS_S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly useS3: boolean;
  private s3Client: any = null;

  constructor() {
    this.useS3 = !!(
      process.env.AWS_S3_BUCKET &&
      process.env.AWS_REGION &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
    );

    if (this.useS3) {
      this.initS3();
    } else {
      this.logger.log('Storage: using local disk (set AWS_S3_BUCKET to enable S3)');
    }
  }

  private async initS3() {
    try {
      const { S3Client } = await import('@aws-sdk/client-s3' as any);
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
      this.logger.log(`Storage: S3 enabled — bucket: ${process.env.AWS_S3_BUCKET}`);
    } catch {
      this.logger.warn('Storage: @aws-sdk/client-s3 not installed, falling back to local disk');
      this.useS3 && (this as any).useS3 === false;
    }
  }

  /**
   * Upload file buffer ke storage.
   * @returns public URL of the uploaded file
   */
  async uploadFile(
    buffer: Buffer,
    filename: string,
    folder: string,
    mimeType: string,
  ): Promise<string> {
    if (this.useS3 && this.s3Client) {
      return this.uploadToS3(buffer, filename, folder, mimeType);
    }
    return this.uploadToLocal(buffer, filename, folder);
  }

  /**
   * Delete file from storage.
   */
  async deleteFile(fileUrl: string): Promise<void> {
    if (this.useS3 && this.s3Client && fileUrl.startsWith('https://')) {
      await this.deleteFromS3(fileUrl);
    } else {
      this.deleteFromLocal(fileUrl);
    }
  }

  private async uploadToS3(
    buffer: Buffer,
    filename: string,
    folder: string,
    mimeType: string,
  ): Promise<string> {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3' as any);
    const key = `${folder}/${filename}`;
    const bucket = process.env.AWS_S3_BUCKET!;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ACL: 'public-read',
      }),
    );

    const region = process.env.AWS_REGION;
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  private async deleteFromS3(fileUrl: string): Promise<void> {
    try {
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3' as any);
      const url = new URL(fileUrl);
      const key = url.pathname.slice(1); // remove leading /
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET!,
          Key: key,
        }),
      );
    } catch (err: any) {
      this.logger.warn(`Failed to delete S3 file: ${err.message}`);
    }
  }

  private uploadToLocal(buffer: Buffer, filename: string, folder: string): string {
    const uploadDir = path.join(process.cwd(), 'uploads', folder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${folder}/${filename}`;
  }

  private deleteFromLocal(fileUrl: string): void {
    if (!fileUrl || !fileUrl.startsWith('/uploads/')) return;
    try {
      const filePath = path.join(process.cwd(), fileUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err: any) {
      this.logger.warn(`Failed to delete local file: ${err.message}`);
    }
  }

  /**
   * Get public URL for a file.
   * For local files, returns the relative path.
   * For S3 files, returns the full URL.
   */
  getPublicUrl(fileUrl: string): string {
    if (!fileUrl) return '';
    if (fileUrl.startsWith('http')) return fileUrl;
    // Local file — prefix with API base URL
    const apiBase = process.env.APP_URL || 'http://localhost:4404';
    return `${apiBase}${fileUrl}`;
  }
}
