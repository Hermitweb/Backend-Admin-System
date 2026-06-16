import { Controller, Get, Post, Query, Body, Res, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ExportService, ExportFormat } from './export.service';
import { CrudService } from '../crud/crud.service';

@Controller('api/v1/export')
export class ExportController {
  constructor(
    private exportService: ExportService,
    private crudService: CrudService,
  ) {}

  @Get('data')
  async exportData(
    @Query('project') projectSlug: string,
    @Query('resource') resourceName: string,
    @Query('format') format: ExportFormat = 'json',
    @Query('fields') fields?: string,
    @Res() res?: Response,
  ) {
    if (!projectSlug || !resourceName) {
      throw new HttpException({
        message: '缺少必要参数: project 和 resource',
      }, HttpStatus.BAD_REQUEST);
    }

    try {
      const result: any = await this.crudService.list(projectSlug, resourceName, {
        limit: 10000,
      });

      const items = result?.items || result || [];
      const fieldsArray = fields ? fields.split(',').map(f => f.trim()) : undefined;
      
      const exported = this.exportService.exportData(items, format, {
        fields: fieldsArray,
        pretty: format === 'json',
      });

      if (res) {
        res.setHeader('Content-Type', exported.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
        return res.send(exported.content);
      }

      return {
        code: 0,
        message: 'success',
        data: {
          content: exported.content,
          contentType: exported.contentType,
          filename: exported.filename,
          count: Array.isArray(items) ? items.length : 0,
        },
      };
    } catch (error: any) {
      throw new HttpException({
        message: `导出失败: ${error.message}`,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('custom')
  async exportCustomData(
    @Body() body: { data: any; format?: ExportFormat; fields?: string[]; filename?: string },
    @Res() res?: Response,
  ) {
    const { data, format = 'json', fields, filename } = body;

    if (!data) {
      throw new HttpException({
        message: '数据不能为空',
      }, HttpStatus.BAD_REQUEST);
    }

    try {
      const safeData = this.exportService.sanitizeData(data);
      
      const exported = this.exportService.exportData(safeData, format, {
        fields,
        pretty: format === 'json',
      });

      const finalFilename = filename || exported.filename;

      if (res) {
        res.setHeader('Content-Type', exported.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"`);
        return res.send(exported.content);
      }

      return {
        code: 0,
        message: 'success',
        data: {
          content: exported.content,
          contentType: exported.contentType,
          filename: finalFilename,
          count: Array.isArray(data) ? data.length : 1,
        },
      };
    } catch (error: any) {
      throw new HttpException({
        message: `导出失败: ${error.message}`,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('formats')
  getAvailableFormats() {
    return {
      code: 0,
      message: 'success',
      data: {
        formats: [
          { value: 'json', label: 'JSON', description: '结构化数据格式' },
          { value: 'csv', label: 'CSV', description: '电子表格兼容格式' },
        ],
        maxRecords: 10000,
      },
    };
  }
}
