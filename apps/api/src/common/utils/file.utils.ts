import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '@nestjs/common';

const logger = new Logger('FileUtils');

/**
 * Delete an old uploaded file when replacing with a new one.
 * Only deletes files in the uploads directory to prevent security issues.
 * @param fileUrl - Relative URL like /uploads/products/xxx.jpg
 */
export function deleteOldFile(fileUrl?: string | null): void {
  if (!fileUrl) return;
  
  // Only delete files in uploads directory
  if (!fileUrl.startsWith('/uploads/')) return;
  
  const filePath = path.join(process.cwd(), fileUrl);
  
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      logger.log(`Deleted old file: ${fileUrl}`);
    } catch (err) {
      logger.warn(`Failed to delete old file ${fileUrl}: ${err.message}`);
    }
  }
}
