import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entity/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
  ) {}

  async log(
    projectId: string,
    userId: string,
    action: 'create' | 'update' | 'delete' | 'custom',
    resource: string,
    recordId: string,
    changes?: Record<string, any>,
    ip?: string,
  ): Promise<AuditLog> {
    const log = this.auditRepository.create({
      project_id: projectId,
      user_id: userId,
      action,
      resource,
      record_id: recordId,
      changes,
      ip,
    });
    return this.auditRepository.save(log);
  }

  async findByProject(projectId: string, page: number = 1, pageSize: number = 20): Promise<{ data: AuditLog[]; meta: any }> {
    const skip = (page - 1) * pageSize;
    const [data, total] = await this.auditRepository.findAndCount({
      where: { project_id: projectId },
      order: { created_at: 'DESC' },
      skip,
      take: pageSize,
    });

    return {
      data,
      meta: {
        page,
        page_size: pageSize,
        total,
        total_pages: Math.ceil(total / pageSize),
      },
    };
  }
}