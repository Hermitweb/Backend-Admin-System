import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrudService } from './crud.service';
import { CrudController } from './crud.controller';
import { ResourceSchema } from '../entity/resource-schema.entity';
import { DatabaseConnection } from '../entity/database-connection.entity';
import { ProjectModule } from '../project/project.module';
import { HookModule } from '../hook/hook.module';
import { SchemaModule } from '../schema/schema.module';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([ResourceSchema, DatabaseConnection]), ProjectModule, HookModule, SchemaModule, DatabaseModule, AuditModule],
  providers: [CrudService],
  controllers: [CrudController],
})
export class CrudModule {}