import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditLog');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const startTime = Date.now();
    
    const method = request.method;
    const url = request.url;
    const userAgent = request.get('user-agent') || 'unknown';
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    const user = (request as any).user;
    
    if (url.includes('/api/v1/auth/login') || url.includes('/api/v1/auth/register')) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          
          if (duration > 1000) {
            this.logger.warn({
              method,
              url,
              status: statusCode,
              duration: `${duration}ms`,
              ip,
              user: user?.email || 'anonymous',
              userAgent: userAgent.substring(0, 50),
            });
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error({
            method,
            url,
            error: error.message,
            duration: `${duration}ms`,
            ip,
            user: user?.email || 'anonymous',
            userAgent: userAgent.substring(0, 50),
          });
        },
      }),
    );
  }
}
