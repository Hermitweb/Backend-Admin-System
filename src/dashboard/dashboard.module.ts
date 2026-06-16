import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { AuditLog } from '../entity/audit-log.entity';
import { Project } from '../entity/project.entity';
import { User } from '../entity/user.entity';
import { ResourceSchema } from '../entity/resource-schema.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, Project, User, ResourceSchema])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
