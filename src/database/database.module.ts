import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseController } from './database.controller';
import { DatabaseService } from './database.service';
import { DynamicConnectionService } from './dynamic-connection.service';
import { DatabaseConnection } from '../entity/database-connection.entity';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DatabaseConnection]),
    ProjectModule,
  ],
  controllers: [DatabaseController],
  providers: [DatabaseService, DynamicConnectionService],
  exports: [DatabaseService, DynamicConnectionService],
})
export class DatabaseModule {}