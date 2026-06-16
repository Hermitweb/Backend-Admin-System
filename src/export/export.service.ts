import { Injectable, Logger } from '@nestjs/common';

export type ExportFormat = 'json' | 'csv';

@Injectable()
export class ExportService {
  private readonly logger = new Logger('ExportService');

  exportToJSON(data: any, options?: { pretty?: boolean }): string {
    const pretty = options?.pretty ?? true;
    try {
      return JSON.stringify(data, null, pretty ? 2 : 0);
    } catch (error) {
      this.logger.error('Failed to export to JSON', error.message);
      throw new Error('JSON 导出失败');
    }
  }

  exportToCSV(data: any[], options?: { 
    fields?: string[]; 
    delimiter?: string;
    includeHeader?: boolean;
  }): string {
    if (!data || data.length === 0) {
      return '';
    }

    const delimiter = options?.delimiter || ',';
    const includeHeader = options?.includeHeader ?? true;
    
    let fields = options?.fields;
    if (!fields) {
      fields = this.getCommonFields(data);
    }

    const escapeValue = (value: any): string => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      const strValue = String(value);
      if (strValue.includes(delimiter) || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    };

    const headerRow = includeHeader 
      ? fields.map(field => escapeValue(field)).join(delimiter)
      : '';

    const dataRows = data.map(row => {
      return fields!.map(field => {
        const value = this.getNestedValue(row, field);
        return escapeValue(value);
      }).join(delimiter);
    });

    return [headerRow, ...dataRows].filter(row => row !== '').join('\n');
  }

  private getCommonFields(data: any[]): string[] {
    const fieldCounts = new Map<string, number>();
    
    data.forEach(row => {
      if (row && typeof row === 'object') {
        Object.keys(row).forEach(key => {
          if (!key.startsWith('_') && key !== 'id' || data.length <= 5) {
            fieldCounts.set(key, (fieldCounts.get(key) || 0) + 1);
          }
        });
      }
    });

    return Array.from(fieldCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([field]) => field);
  }

  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    return value;
  }

  exportData(data: any, format: ExportFormat, options?: any): { content: string; contentType: string; filename: string } {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFilename = `export-${timestamp}`;

    switch (format) {
      case 'json':
        return {
          content: this.exportToJSON(data, options),
          contentType: 'application/json',
          filename: `${baseFilename}.json`,
        };
      case 'csv':
        return {
          content: this.exportToCSV(Array.isArray(data) ? data : [data], options),
          contentType: 'text/csv',
          filename: `${baseFilename}.csv`,
        };
      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }
  }

  sanitizeData(data: any, sensitiveFields: string[] = ['password', 'token', 'secret']): any {
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item, sensitiveFields));
    }
    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (sensitiveFields.includes(key.toLowerCase())) {
          sanitized[key] = '***';
        } else {
          sanitized[key] = this.sanitizeData(value, sensitiveFields);
        }
      }
      return sanitized;
    }
    return data;
  }

  getFileExtension(format: ExportFormat): string {
    return format === 'json' ? 'json' : 'csv';
  }

  getContentType(format: ExportFormat): string {
    return format === 'json' ? 'application/json' : 'text/csv';
  }
}
