import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, TimeoutError } from 'rxjs';
import { map, timeout, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  private readonly logger = new Logger(ResponseInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const startTime = Date.now();

    return next.handle().pipe(
      timeout(30000),
      map((data) => {
        const duration = Date.now() - startTime;
        
        response.setHeader('X-Response-Time', `${duration}ms`);
        
        if (data && typeof data === 'object' && 'code' in data && 'message' in data) {
          return {
            ...data,
            timestamp: new Date().toISOString(),
          };
        }
        
        if (data && data.meta) {
          return {
            code: 0,
            message: 'success',
            data: data.data,
            meta: data.meta,
            timestamp: new Date().toISOString(),
          };
        }
        
        return {
          code: 0,
          message: 'success',
          data,
          timestamp: new Date().toISOString(),
        };
      }),
      catchError((error) => {
        if (error instanceof TimeoutError) {
          this.logger.error(`Request timeout: ${request.method} ${request.url}`);
          throw new Error('请求超时，请稍后重试');
        }
        throw error;
      }),
    );
  }
}
