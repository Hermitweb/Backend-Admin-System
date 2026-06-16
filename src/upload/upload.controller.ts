import { Controller, Post, Get, Delete, Body, Query, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService, UploadedFile as UploadFileInfo } from './upload.service';

@Controller('api/v1/uploads')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile()
    file: any,
    @Query('category') category?: 'images' | 'documents',
  ) {
    const uploaded = await this.uploadService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      category || 'images',
    );

    return {
      code: 0,
      message: 'success',
      data: uploaded,
    };
  }

  @Post('multiple')
  @UseInterceptors(FileInterceptor('files'))
  async uploadMultipleFiles(
    @UploadedFile() files: any[],
    @Query('category') category?: 'images' | 'documents',
  ) {
    const uploadedFiles: UploadFileInfo[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const uploaded = await this.uploadService.uploadFile(
          file.buffer,
          file.originalname,
          file.mimetype,
          category || 'images',
        );
        uploadedFiles.push(uploaded);
      } catch (error: any) {
        errors.push(`${file.originalname}: ${error.message}`);
      }
    }

    return {
      code: errors.length > 0 ? 1 : 0,
      message: errors.length > 0 ? '部分文件上传失败' : 'success',
      data: {
        uploaded: uploadedFiles,
        errors,
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
      data: {
        maxFileSize: this.uploadService.getMaxFileSize(),
        allowedExtensions: this.uploadService.getAllowedExtensions(),
      },
    };
  }
}
