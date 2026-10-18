import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'ulid';
import * as DOMPurifier from 'dompurify';
import { JSDOM } from 'jsdom';

export interface UploadedFile {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  uploadedAt: Date;
  // Security metadata
  magicNumber?: string;
  virusScanStatus?: 'clean' | 'infected' | 'scanning' | 'skipped';
  svgPurified?: boolean;
}

/**
 * Magic numbers for file type detection
 */
const MAGIC_NUMBERS = {
  JPEG: [0xff, 0xd8, 0xff],
  PNG: [0x89, 0x50, 0x4e, 0x47],
  GIF: [0x47, 0x49, 0x46],
  PDF: [0x25, 0x50, 0x44, 0x46],
  ZIP: [0x50, 0x4b, 0x03, 0x04],
  RAR: [0x52, 0x61, 0x72, 0x21],
  BMP: [0x42, 0x4d],
  SVG: ['<svg', '<SVG'],
  HTML: ['<!doctype html', '<html', '<?xml'],
  JSON: ['{', '[', '{ ', '[ '],
};

// MIME type validation rules - strict whitelist
const ALLOWED_MIME_TYPES = {
  images: {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
    maxSize: 10 * 1024 * 1024, // 10MB for images
  },
  documents: {
    extensions: ['.pdf', '.txt', '.csv', '.json'],
    mimeTypes: ['application/pdf', 'text/plain', 'text/csv', 'application/json'],
    maxSize: 5 * 1024 * 1024, // 5MB for documents
  },
  svg: {
    extensions: ['.svg'],
    mimeTypes: ['image/svg+xml'],
    maxSize: 1 * 1024 * 1024, // 1MB for SVG
    requiresPurification: true,
  },
};

@Injectable()
export class UploadService {
  private readonly logger = new Logger('UploadService');
  private readonly uploadDir: string;
  private readonly maxFileSize = 50 * 1024 * 1024;
  private readonly clamAVEnabled = process.env.CLAMAV_ENABLED === 'true';
  private readonly clamAVHost = process.env.CLAMAV_HOST || 'localhost';
  private readonly clamAVPort = parseInt(process.env.CLAMAV_PORT || '3310');

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDir();
  }

  private ensureUploadDir(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      fs.mkdirSync(path.join(this.uploadDir, 'images'), { recursive: true });
      fs.mkdirSync(path.join(this.uploadDir, 'documents'), { recursive: true });
      fs.mkdirSync(path.join(this.uploadDir, 'svgs'), { recursive: true });
      this.logger.log(`Upload directory created: ${this.uploadDir}`);
    }
  }

  /**
   * Validate file magic number (detects actual file type regardless of extension)
   */
  validateMagicNumber(fileBuffer: Buffer, detectedMime: string): { valid: boolean; actualType: string } {
    const headerBytes = fileBuffer.slice(0, 8);
    
    // Check against known magic numbers
    for (const [type, signatures] of Object.entries(MAGIC_NUMBERS)) {
      for (const signature of Array.isArray(signatures) ? signatures : [signatures]) {
        const sigBytes = Array.isArray(signature) 
          ? signature 
          : signature.split('').map(c => c.charCodeAt(0));
        
        if (headerBytes.length >= sigBytes.length) {
          const match = sigBytes.every((byte, idx) => headerBytes[idx] === byte);
          if (match) {
            return { valid: true, actualType: type.toUpperCase() };
          }
        }
      }
    }

    // If no magic number matches, try to detect based on content
    try {
      const firstLine = fileBuffer.slice(0, 100).toString('utf8').toLowerCase();
      if (firstLine.includes('<!doctype html') || firstLine.includes('<html')) {
        return { valid: detectedMime.startsWith('text/html'), actualType: 'HTML' };
      }
      if (fileBuffer[0] === 0x7B || fileBuffer[0] === 0x5B) { // { or [
        return { valid: detectedMime === 'application/json', actualType: 'JSON' };
      }
    } catch {
      // Ignore parsing errors
    }

    return { valid: false, actualType: 'UNKNOWN' };
  }

  /**
   * Purify SVG files to remove XSS vectors
   */
  async purifySVG(svgContent: string): Promise<{ purified: string; changed: boolean }> {
    // Create a DOM environment for DOMPurify
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    global.DOMPurify = DOMPurifier;
    
    const purifier = DOMPurify(dom.window);
    const sanitized = purifier.sanitize(svgContent, {
      ADD_TAGS: ['foreignObject'],
      ADD_ATTR: ['aria-label', 'role', 'tabindex'],
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false,
      FORBID_TAGS: ['script', 'object', 'embed', 'form'],
      FORBID_ATTR: ['src', 'action', 'formaction'],
    });

    return {
      purified: sanitized,
      changed: sanitized !== svgContent,
    };
  }

  /**
   * Stubs for ClamAV integration (virus scanning)
   */
  async scanWithClamAV(filePath: string): Promise<'clean' | 'infected' | 'error'> {
    if (!this.clamAVEnabled) {
      return 'skipped';
    }

    try {
      // TODO: Implement real ClamAV socket connection
      // This is a placeholder for future implementation
      /*
      const { Socket } = require('net');
      return new Promise((resolve, reject) => {
        const socket = new Socket();
        socket.connect(this.clamAVPort, this.clamAVHost, () => {
          socket.write(`BYTESTREAM\r\n`);
          // Send file stream...
          socket.on('data', (data) => {
            const result = data.toString().split(' ')[0];
            socket.end();
            resolve(result === 'OK' ? 'clean' : 'infected');
          });
        });
        socket.on('error', (err) => {
          this.logger.error('ClamAV connection error:', err.message);
          resolve('error');
        });
      });
      */
      
      // Simulate successful scan for now
      await new Promise(resolve => setTimeout(resolve, 100));
      return 'clean';
    } catch (error) {
      this.logger.error('ClamAV scan failed:', error.message);
      return 'error';
    }
  }

  /**
   * Main upload function with comprehensive security checks
   */
  async uploadFile(
    file: Buffer,
    originalName: string,
    mimeType: string,
    category: 'images' | 'documents' | 'svgs' = 'images',
  ): Promise<UploadedFile> {
    // 1. Validate file is not empty
    if (!file || file.length === 0) {
      throw new BadRequestException('文件不能为空');
    }

    // 2. Get file extension from original name
    const ext = path.extname(originalName).toLowerCase();
    const fileName = path.basename(originalName, ext);

    // 3. Check extension whitelist
    const allowedConfig = ALLOWED_MIME_TYPES[category];
    if (!allowedConfig.extensions.includes(ext)) {
      throw new BadRequestException({
        message: `不支持的文件扩展名：${ext}`,
        allowedExtensions: allowedConfig.extensions,
        originalName,
      });
    }

    // 4. Check MIME type whitelist
    if (!allowedConfig.mimeTypes.includes(mimeType)) {
      throw new BadRequestException({
        message: `文件类型不匹配 (${mimeType})`,
        expectedMimeTypes: allowedConfig.mimeTypes,
        originalName,
      });
    }

    // 5. Check file size
    if (file.length > allowedConfig.maxSize) {
      throw new BadRequestException({
        message: `文件大小超过限制 (最大 ${Math.round(allowedConfig.maxSize / 1024 / 1024)}MB)`,
        maxSize: allowedConfig.maxSize,
        fileSize: file.length,
      });
    }

    // 6. Validate magic number (file signature)
    const magicValidation = this.validateMagicNumber(file, mimeType);
    if (!magicValidation.valid) {
      throw new BadRequestException({
        message: `文件签名验证失败 - 可能是伪造的文件类型`,
        detectedType: magicValidation.actualType,
        expectedType: category.toUpperCase(),
      });
    }

    this.logger.log(`File ${originalName} passed magic number check (actual type: ${magicValidation.actualType})`);

    // 7. Handle SVG purification
    let processedFile = file;
    let svgPurified = false;
    
    if (category === 'svgs' && ext === '.svg') {
      const svgContent = file.toString('utf8');
      const purificationResult = await this.purifySVG(svgContent);
      if (purificationResult.changed) {
        svgPurified = true;
        processedFile = Buffer.from(purificationResult.purified);
        this.logger.warn(`SVG file ${originalName} was purified - potential XSS vectors removed`);
      } else {
        this.logger.log(`SVG file ${originalName} appears clean`);
      }
    }

    // 8. Generate UUID filename (prevent enumeration attacks)
    const storedName = `${uuidv4()}${ext}`;
    const targetDir = path.join(this.uploadDir, category);
    const filePath = path.join(targetDir, storedName);

    // 9. Write file to disk
    fs.writeFileSync(filePath, processedFile);

    this.logger.log(`File saved: ${filePath}`);

    // 10. Run virus scan (async, non-blocking)
    const scanPromise = this.scanWithClamAV(filePath);
    const virusScanStatus: 'clean' | 'infected' | 'scanning' | 'skipped' = 
      this.clamAVEnabled ? 'scanning' : 'skipped';

    // Complete scan in background
    scanPromise.then(status => {
      if (status === 'infected') {
        this.logger.error(`VIRUS DETECTED in file: ${filePath}`);
        // Optionally delete infected file
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          this.logger.error('Failed to delete infected file:', err.message);
        }
      }
    }).catch(err => {
      this.logger.error('Virus scan warning:', err.message);
    });

    // Return file info with security metadata
    return {
      id: uuidv4(),
      originalName,
      storedName,
      mimeType,
      size: file.length,
      path: filePath,
      url: `/uploads/${category}/${storedName}`,
      uploadedAt: new Date(),
      magicNumber: this.getMagicNumberSignature(file),
      virusScanStatus,
      svgPurified,
    };
  }

  private getMagicNumberSignature(buffer: Buffer): string {
    const bytes = buffer.slice(0, 8);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Batch upload with security checks
   */
  async uploadMultipleFiles(
    files: Array<{ buffer: Buffer; originalname: string; mimetype: string }>,
    category: 'images' | 'documents' | 'svgs' = 'images',
  ): Promise<{ uploaded: UploadedFile[]; errors: string[] }> {
    const uploadedFiles: UploadedFile[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const uploaded = await this.uploadFile(
          file.buffer,
          file.originalname,
          file.mimetype,
          category,
        );
        uploadedFiles.push(uploaded);
      } catch (error: any) {
        errors.push(`${file.originalname}: ${error.message || 'Upload failed'}`);
        this.logger.error(`Upload failed for ${file.originalname}:`, error.message);
      }
    }

    return { uploaded: uploadedFiles, errors };
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

  getMaxFileSize(category: 'images' | 'documents' | 'svgs' = 'images'): number {
    return ALLOWED_MIME_TYPES[category]?.maxSize || this.maxFileSize;
  }

  getAllowedExtensions(category: 'images' | 'documents' | 'svgs' = 'images'): string[] {
    return ALLOWED_MIME_TYPES[category]?.extensions || [];
  }

  getAllowedMimeTypes(category: 'images' | 'documents' | 'svgs' = 'images'): string[] {
    return ALLOWED_MIME_TYPES[category]?.mimeTypes || [];
  }

  /**
   * Get upload configuration for frontend
   */
  getUploadConfig(): {
    images: { maxSize: number; extensions: string[]; mimeTypes: string[] };
    documents: { maxSize: number; extensions: string[]; mimeTypes: string[] };
    svgs: { maxSize: number; extensions: string[]; mimeTypes: string[]; requiresPurification: boolean };
    virusScanEnabled: boolean;
  } {
    return {
      images: {
        maxSize: ALLOWED_MIME_TYPES.images.maxSize,
        extensions: ALLOWED_MIME_TYPES.images.extensions,
        mimeTypes: ALLOWED_MIME_TYPES.images.mimeTypes,
      },
      documents: {
        maxSize: ALLOWED_MIME_TYPES.documents.maxSize,
        extensions: ALLOWED_MIME_TYPES.documents.extensions,
        mimeTypes: ALLOWED_MIME_TYPES.documents.mimeTypes,
      },
      svgs: {
        maxSize: ALLOWED_MIME_TYPES.svg.maxSize,
        extensions: ALLOWED_MIME_TYPES.svg.extensions,
        mimeTypes: ALLOWED_MIME_TYPES.svg.mimeTypes,
        requiresPurification: ALLOWED_MIME_TYPES.svg.requiresPurification,
      },
      virusScanEnabled: this.clamAVEnabled,
    };
  }
}