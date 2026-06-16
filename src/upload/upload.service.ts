import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface UploadedFile {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  uploadedAt: Date;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger('UploadService');
  private readonly uploadDir: string;
  private readonly maxFileSize = 50 * 1024 * 1024;
  private readonly allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  private readonly allowedDocumentTypes = [
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'application/json',
  ];

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDir();
  }

  private ensureUploadDir(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      fs.mkdirSync(path.join(this.uploadDir, 'images'), { recursive: true });
      fs.mkdirSync(path.join(this.uploadDir, 'documents'), { recursive: true });
      this.logger.log(`Upload directory created: ${this.uploadDir}`);
    }
  }

  async uploadFile(
    file: Buffer,
    originalName: string,
    mimeType: string,
    category: 'images' | 'documents' = 'images',
  ): Promise<UploadedFile> {
    this.validateFile(file, originalName, mimeType);
    
    const ext = path.extname(originalName).toLowerCase();
    const storedName = `${Date.now()}-${uuidv4()}${ext}`;
    const targetDir = path.join(this.uploadDir, category);
    const filePath = path.join(targetDir, storedName);
    
    fs.writeFileSync(filePath, file);
    
    return {
      id: uuidv4(),
      originalName,
      storedName,
      mimeType,
      size: file.length,
      path: filePath,
      url: `/uploads/${category}/${storedName}`,
      uploadedAt: new Date(),
    };
  }

  validateFile(file: Buffer, originalName: string, mimeType: string): void {
    if (!file || file.length === 0) {
      throw new BadRequestException('文件不能为空');
    }

    if (file.length > this.maxFileSize) {
      throw new BadRequestException({
        message: `文件大小超过限制 (最大 ${Math.round(this.maxFileSize / 1024 / 1024)}MB)`,
        maxSize: this.maxFileSize,
        fileSize: file.length,
      });
    }

    const ext = path.extname(originalName).toLowerCase();
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const docExts = ['.pdf', '.xls', '.xlsx', '.doc', '.docx', '.txt', '.csv', '.json'];
    
    const isImage = imageExts.includes(ext);
    const isDoc = docExts.includes(ext);
    const isImageMime = this.allowedImageTypes.includes(mimeType);
    const isDocMime = this.allowedDocumentTypes.includes(mimeType);

    if (!isImage && !isDoc && !isImageMime && !isDocMime) {
      throw new BadRequestException({
        message: '不支持的文件类型',
        allowedExtensions: [...imageExts, ...docExts],
        originalName,
      });
    }
  }

  deleteFile(filePath: string): boolean {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`File deleted: ${filePath}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to delete file: ${filePath}`, error.message);
      return false;
    }
  }

  getFileInfo(filePath: string): { exists: boolean; size: number; mtime: Date } | null {
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        return {
          exists: true,
          size: stats.size,
          mtime: stats.mtime,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  getMaxFileSize(): number {
    return this.maxFileSize;
  }

  getAllowedExtensions(): string[] {
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const docExts = ['.pdf', '.xls', '.xlsx', '.doc', '.docx', '.txt', '.csv', '.json'];
    return [...imageExts, ...docExts];
  }
}
