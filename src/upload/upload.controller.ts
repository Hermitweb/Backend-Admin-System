import { Controller, Post, Get, Delete, Body, Query, UseInterceptors, UploadedFile, ValidationPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService, UploadedFile as UploadFileInfo } from './upload.service';

@Controller('api/v1/uploads')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: any,
    @Query('category') category?: 'images' | 'documents' | 'svgs',
  ) {
    try {
      const uploaded = await this.uploadService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        category || 'images',
      );

      return {
        code: 0,
        message: 'Upload successful',
        data: uploaded,
      };
    } catch (error: any) {
      return {
        code: 1,
        message: error.message || 'Upload failed',
        data: null,
      };
    }
  }

  @Post('multiple')
  @UseInterceptors(FileInterceptor('files'))
  async uploadMultipleFiles(
    @UploadedFile() files: any[],
    @Query('category') category?: 'images' | 'documents' | 'svgs',
  ) {
    const fileObjects = files.map(f => ({
      buffer: f.buffer,
      originalname: f.originalname,
      mimetype: f.mimetype,
    }));

    const result = await this.uploadService.uploadMultipleFiles(fileObjects, category || 'images');

    return {
      code: result.errors.length > 0 ? 1 : 0,
      message: result.errors.length > 0 ? '部分文件上传失败' : 'success',
      data: {
        uploaded: result.uploaded,
        errors: result.errors,
      },
    };
  }

  @Delete()
  async deleteFile(@Body('path') filePath: string) {
    const success = this.uploadService.deleteFile(filePath);
    return {
      code: success ? 0 : 1,
      message: success ? 'success' : 'file not found',
      data: { success },
    };
  }

  @Get('info')
  async getFileInfo(@Query('path') filePath: string) {
    const info = this.uploadService.getFileInfo(filePath);
    return {
      code: 0,
      message: 'success',
      data: info,
    };
  }

  @Get('config')
  async getConfig() {
    return {
      code: 0,
      message: 'success',
      data: this.uploadService.getUploadConfig(),
    };
  }
}
