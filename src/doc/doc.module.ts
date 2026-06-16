import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocService } from './doc.service';
import { DocController } from './doc.controller';
import { DocVersion } from '../entity/doc-version.entity';
import { ResourceSchema } from '../entity/resource-schema.entity';
import { CustomEndpoint } from '../entity/custom-endpoint.entity';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocVersion, ResourceSchema, CustomEndpoint]),
    ProjectModule,
  ],
  providers: [DocService],
  controllers: [DocController],
  exports: [DocService],
})
export class DocModule {}