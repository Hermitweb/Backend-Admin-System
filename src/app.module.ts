import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ProjectModule } from './project/project.module';
import { UserModule } from './user/user.module';
import { SchemaModule } from './schema/schema.module';
import { CrudModule } from './crud/crud.module';
import { LinkModule } from './link/link.module';
import { DocModule } from './doc/doc.module';
import { AuditModule } from './audit/audit.module';
import { EndpointModule } from './endpoint/endpoint.module';
import { DatabaseModule } from './database/database.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ProjectMemberModule } from './project-member/project-member.module';
import { SettingsModule } from './settings/settings.module';
import { HealthModule } from './health/health.module';
import { UploadModule } from './upload/upload.module';
import { ExportModule } from './export/export.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const dbType = configService.get('DB_TYPE');
        if (dbType === 'sqlite') {
          return {
            type: 'sqlite',
            database: configService.get('DB_DATABASE'),
            autoLoadEntities: true,
            synchronize: true,
          } as TypeOrmModuleOptions;
        }
        return {
          type: dbType as any,
          host: configService.get('DB_HOST'),
          port: parseInt(configService.get('DB_PORT')),
          username: configService.get('DB_USERNAME'),
          password: configService.get('DB_PASSWORD'),
          database: configService.get('DB_DATABASE'),
          autoLoadEntities: true,
          synchronize: true,
        } as TypeOrmModuleOptions;
      },
      inject: [ConfigService],
    }),
    AuthModule,
    ProjectModule,
    UserModule,
    SchemaModule,
    CrudModule,
    LinkModule,
    DocModule,
    AuditModule,
    EndpointModule,
    DatabaseModule,
    DashboardModule,
    ProjectMemberModule,
    SettingsModule,
    HealthModule,
    UploadModule,
    ExportModule,
  ],
})
export class AppModule {}