import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomEndpoint } from '../entity/custom-endpoint.entity';
import { EndpointController } from './endpoint.controller';
import { EndpointService } from './endpoint.service';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomEndpoint]),
    ProjectModule,
  ],
  controllers: [EndpointController],
  providers: [EndpointService],
  exports: [EndpointService],
})
export class EndpointModule {}
