import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { HttpExceptionFilter } from './common/filters/exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 3000;
  
  const logger = new Logger('Bootstrap');
  
  app.enableCors({
    origin: configService.get('CORS_ORIGINS') ? configService.get('CORS_ORIGINS').split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 3600,
  });
  
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false,
    errorHttpStatusCode: 422,
  }));
  
  app.useGlobalInterceptors(new ResponseInterceptor(), new AuditLogInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  
  const nodeEnv = configService.get('NODE_ENV') || 'development';
  logger.log(`==================================================`);
  logger.log(`  Backend Admin System`);
  logger.log(`  Environment: ${nodeEnv}`);
  logger.log(`  Port: ${port}`);
  logger.log(`  CORS: ${configService.get('CORS_ORIGINS') || '*'}`);
  logger.log(`==================================================`);
  
  await app.listen(port);
  logger.log(`Application is running on http://localhost:${port}`);
  logger.log(`API Base Path: /api/v1`);
  logger.log(`Health Check: http://localhost:${port}/api/v1/health`);
}

bootstrap();
