import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchemaService } from './schema.service';
import { SchemaController } from './schema.controller';
import { ResourceSchema } from '../entity/resource-schema.entity';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [TypeOrmModule.forFeature([ResourceSchema]), ProjectModule],
  providers: [SchemaService],
  controllers: [SchemaController],
  exports: [SchemaService],
})
export class SchemaModule {}