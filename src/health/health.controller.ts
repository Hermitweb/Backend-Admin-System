import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entity/user.entity';
import { Project } from '../entity/project.entity';
import { ResourceSchema } from '../entity/resource-schema.entity';
import { AuditLog } from '../entity/audit-log.entity';

@Controller('api/v1/health')
export class HealthController {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(ResourceSchema)
    private schemaRepository: Repository<ResourceSchema>,
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
  ) {}

  @Get()
  async check() {
    const startTime = Date.now();
    
    try {
      const [userCount, projectCount, schemaCount, auditCount] = await Promise.all([
        this.userRepository.count(),
        this.projectRepository.count(),
        this.schemaRepository.count(),
        this.auditRepository.count(),
      ]);
      
      const databaseResponseTime = Date.now() - startTime;
      
      return {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {
          database: {
            status: 'connected',
            responseTime: `${databaseResponseTime}ms`,
          },
          api: {
            status: 'running',
            version: '1.0.0',
          },
        },
        statistics: {
          users: userCount,
          projects: projectCount,
          schemas: schemaCount,
          audit_logs: auditCount,
        },
        memory: {
          total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
          used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
          rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {
          database: {
            status: 'disconnected',
            error: error.message,
          },
          api: {
            status: 'running',
          },
        },
        error: {
          message: error.message,
        },
      };
    }
  }
  
  @Get('ready')
  async ready() {
    try {
      await this.userRepository.count();
      return { status: 'ready', timestamp: new Date().toISOString() };
    } catch {
      return { status: 'not_ready', timestamp: new Date().toISOString() };
    }
  }
  
  @Get('live')
  async live() {
    return { status: 'live', timestamp: new Date().toISOString() };
  }
}
