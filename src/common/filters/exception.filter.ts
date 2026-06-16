import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: any[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      
      if (typeof response === 'object' && response !== null) {
        message = (response as any).message || message;
        if (Array.isArray((response as any).message)) {
          message = (response as any).message.join(', ');
        }
        errors = (response as any).errors || [];
      } else {
        message = response as string || message;
      }
    } else if (exception.name === 'ValidationError') {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
    }

    this.logger.error({
      status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error: exception.stack || exception.message,
    });

    if (response.headersSent) {
      return;
    }

    response.status(status).json({
      code: status,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
