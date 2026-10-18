import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, DataSource } from 'typeorm';
import { ResourceSchema } from '../entity/resource-schema.entity';
import { ProjectService } from '../project/project.service';
import { v4 as uuidv4 } from 'uuid';
import { HookService } from '../hook/hook.service';
import { SchemaService } from '../schema/schema.service';
import { DatabaseConnection } from '../entity/database-connection.entity';
import { DynamicConnectionService } from '../database/dynamic-connection.service';
import { AuditService } from '../audit/audit.service';
import * as crypto from 'crypto';

// 项目标识白名单验证 (仅允许字母、数字、连字符)
const PROJECT_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// 资源名称白名单 (仅允许字母、数字、下划线)
const RESOURCE_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

/**
 * 生成安全的表名字符串
 */
export function generateTableName(projectSlug: string, resourceName: string): string {
  // 双重校验：先正则，再转小写并替换空格
  const slug = projectSlug.toLowerCase().replace(/\s+/g, '_');
  const resource = resourceName.toLowerCase();
  
  if (!PROJECT_SLUG_PATTERN.test(slug)) {
    throw new Error(`Invalid project slug format: ${projectSlug}`);
  }
  
  if (!RESOURCE_NAME_PATTERN.test(resource)) {
    throw new Error(`Invalid resource name format: ${resourceName}`);
  }
  
  return `project_${slug}_${resource}`;
}

/**
 * 生成安全的版本表名字符串
 */
export function generateVersionTableName(projectSlug: string, resourceName: string): string {
  return `${generateTableName(projectSlug, resourceName)}_versions`;
}

@Injectable()
export class CrudService {
  constructor(
    @InjectRepository(ResourceSchema)
    private schemaRepository: Repository<ResourceSchema>,
    @InjectRepository(DatabaseConnection)
    private databaseConnectionRepository: Repository<DatabaseConnection>,
    private projectService: ProjectService,
    private hookService: HookService,
    private schemaService: SchemaService,
    private dynamicConnectionService: DynamicConnectionService,
    @Inject(AuditService)
    private auditService: AuditService,
  ) {}

  private async getDataSource(projectId: string): Promise<DataSource> {
    const connection = await this.databaseConnectionRepository.findOne({
      where: { project_id: projectId, enabled: true },
    });

    if (connection) {
      return this.dynamicConnectionService.getConnection(connection);
    }

    return this.schemaRepository.manager.connection;
  }

  async list(
    projectSlug: string,
    resourceName: string,
    query: any,
  ): Promise<{ data: any[]; meta: any }> {
    const project = await this.projectService.findBySlug(projectSlug);
    const schema = await this.schemaRepository.findOne({
      where: { project_id: project.id, name: resourceName },
    });

    if (!schema) {
      throw new NotFoundException('Resource not found');
    }

    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.page_size) || 20;
    const skip = (page - 1) * pageSize;

    // 白名单校验后生成安全表名
    const tableName = generateTableName(projectSlug, resourceName);
    
    const dataSource = await this.getDataSource(project.id);
    const qb = dataSource
      .createQueryBuilder()
      .select('*')
      .from(tableName, resourceName);

    if (query.filter) {
      this.applyFilters(qb, query.filter, resourceName);
    }

    if (query.sort) {
      this.applySorting(qb, query.sort, resourceName);
    }

    if (query.fields) {
      const fields = query.fields.split(',');
      // 字段白名单校验
      const safeFields = fields.filter(f => /^[a-z_]+$/.test(f));
      if (safeFields.length !== fields.length) {
        throw new Error('Invalid field names in query');
      }
      qb.select(safeFields.map(f => `${resourceName}.${f}`));
    }

    const data = await qb.skip(skip).take(pageSize).getRawMany();
    
    const countQb = dataSource
      .createQueryBuilder()
      .select('COUNT(*) as count')
      .from(tableName, resourceName);

    if (query.filter) {
      this.applyFilters(countQb, query.filter, resourceName);
    }

    const countResult = await countQb.getRawOne();
    const total = parseInt(countResult.count) || 0;

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

  async create(projectSlug: string, resourceName: string, data: any, userId: string = ''): Promise<any> {
    const project = await this.projectService.findBySlug(projectSlug);
    const schema = await this.schemaRepository.findOne({
      where: { project_id: project.id, name: resourceName },
    });

    if (!schema) {
      throw new NotFoundException('Resource not found');
    }

    const processedData = await this.hookService.executeBeforeHooks(
      projectSlug,
      resourceName,
      'create',
      { ...data, id: uuidv4() },
    );

    let definition = typeof schema.definition === 'string' ? JSON.parse(schema.definition) : schema.definition;
    if (Array.isArray(definition)) {
      definition = { fields: definition };
    }
    await this.schemaService.createTable(projectSlug, resourceName, definition);

    const tableName = generateTableName(projectSlug, resourceName);
    const dataSource = await this.getDataSource(project.id);
    const result = await dataSource
      .createQueryBuilder()
      .insert()
      .into(tableName)
      .values(processedData)
      .execute();

    const createdRecord = result.generatedMaps[0] || processedData;
    await this.hookService.executeAfterHooks(projectSlug, resourceName, 'create', createdRecord);
    
    if (userId) {
      await this.auditService.log(project.id, userId, 'create', resourceName, createdRecord.id, processedData);
    }

    return createdRecord;
  }

  async update(projectSlug: string, resourceName: string, id: string, data: any, userId: string = ''): Promise<any> {
    const project = await this.projectService.findBySlug(projectSlug);
    const schema = await this.schemaRepository.findOne({
      where: { project_id: project.id, name: resourceName },
    });

    if (!schema) {
      throw new NotFoundException('Resource not found');
    }

    const processedData = await this.hookService.executeBeforeHooks(
      projectSlug,
      resourceName,
      'update',
      { ...data, id },
    );

    const tableName = generateTableName(projectSlug, resourceName);
    const dataSource = await this.getDataSource(project.id);
    await dataSource
      .createQueryBuilder()
      .update(tableName)
      .set({ ...processedData, updated_at: new Date() })
      .where('id = :id', { id })
      .execute();

    const updatedRecord = await this.get(projectSlug, resourceName, id);
    await this.hookService.executeAfterHooks(projectSlug, resourceName, 'update', updatedRecord);
    
    if (userId) {
      await this.auditService.log(project.id, userId, 'update', resourceName, id, processedData);
    }

    return updatedRecord;
  }

  async delete(projectSlug: string, resourceName: string, id: string, userId: string = ''): Promise<void> {
    const project = await this.projectService.findBySlug(projectSlug);
    const schema = await this.schemaRepository.findOne({
      where: { project_id: project.id, name: resourceName },
    });

    if (!schema) {
      throw new NotFoundException('Resource not found');
    }

    const tableName = generateTableName(projectSlug, resourceName);
    const dataSource = await this.getDataSource(project.id);
    const result = await dataSource
      .createQueryBuilder()
      .delete()
      .from(tableName)
      .where('id = :id', { id })
      .execute();

    if (result.affected === 0) {
      throw new NotFoundException('Record not found');
    }
    
    if (userId) {
      await this.auditService.log(project.id, userId, 'delete', resourceName, id);
    }
  }

  async batchUpdate(
    projectSlug: string,
    resourceName: string,
    ids: string[],
    data: any,
    userId: string = '',
  ): Promise<{ affected: number }> {
    const project = await this.projectService.findBySlug(projectSlug);
    const schema = await this.schemaRepository.findOne({
      where: { project_id: project.id, name: resourceName },
    });

    if (!schema) {
      throw new NotFoundException('Resource not found');
    }

    const tableName = generateTableName(projectSlug, resourceName);
    const dataSource = await this.getDataSource(project.id);
    const result = await dataSource
      .createQueryBuilder()
      .update(tableName)
      .set({ ...data, updated_at: new Date() })
      .where('id IN (:...ids)', { ids })
      .execute();

    return { affected: result.affected };
  }

  async batchDelete(
    projectSlug: string,
    resourceName: string,
    ids: string[],
    mode: 'soft' | 'hard' = 'soft',
    userId: string = '',
  ): Promise<{ affected: number }> {
    const project = await this.projectService.findBySlug(projectSlug);
    const schema = await this.schemaRepository.findOne({
      where: { project_id: project.id, name: resourceName },
    });

    if (!schema) {
      throw new NotFoundException('Resource not found');
    }

    const tableName = generateTableName(projectSlug, resourceName);
    const dataSource = await this.getDataSource(project.id);
    
    if (mode === 'soft') {
      const result = await dataSource
        .createQueryBuilder()
        .update(tableName)
        .set({ deleted_at: new Date(), updated_at: new Date() })
        .where('id IN (:...ids) AND deleted_at IS NULL', { ids })
        .execute();
      return { affected: result.affected };
    } else {
      const result = await dataSource
        .createQueryBuilder()
        .delete()
        .from(tableName)
        .where('id IN (:...ids)', { ids })
        .execute();
      return { affected: result.affected };
    }
  }

  async getVersions(projectSlug: string, resourceName: string, id: string): Promise<any[]> {
    const project = await this.projectService.findBySlug(projectSlug);
    const schema = await this.schemaRepository.findOne({
      where: { project_id: project.id, name: resourceName },
    });

    if (!schema) {
      throw new NotFoundException('Resource not found');
    }

    const versionTableName = generateVersionTableName(projectSlug, resourceName);
    
    const exists = await this.schemaRepository.manager.query(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='${versionTableName}'`,
    );
    
    if (!exists || exists.length === 0) {
      return [];
    }

    const versions = await this.schemaRepository.manager
      .createQueryBuilder()
      .select('*')
      .from(versionTableName, 'v')
      .where('v.record_id = :id', { id })
      .orderBy('v.version', 'DESC')
      .getRawMany();

    return versions;
  }

  async getVersion(
    projectSlug: string,
    resourceName: string,
    id: string,
    version: number,
  ): Promise<any> {
    const project = await this.projectService.findBySlug(projectSlug);
    const schema = await this.schemaRepository.findOne({
      where: { project_id: project.id, name: resourceName },
    });

    if (!schema) {
      throw new NotFoundException('Resource not found');
    }

    const versionTableName = generateVersionTableName(projectSlug, resourceName);
    
    const result = await this.schemaRepository.manager
      .createQueryBuilder()
      .select('*')
      .from(versionTableName, 'v')
      .where('v.record_id = :id AND v.version = :version', { id, version })
      .getRawOne();

    if (!result) {
      throw new NotFoundException('Version not found');
    }

    return result;
  }

  async restoreVersion(
    projectSlug: string,
    resourceName: string,
    id: string,
    version: number,
    userId: string = '',
  ): Promise<any> {
    const project = await this.projectService.findBySlug(projectSlug);
    const schema = await this.schemaRepository.findOne({
      where: { project_id: project.id, name: resourceName },
    });

    if (!schema) {
      throw new NotFoundException('Resource not found');
    }

    const versionTableName = generateVersionTableName(projectSlug, resourceName);
    const tableName = generateTableName(projectSlug, resourceName);

    const versionData = await this.schemaRepository.manager
      .createQueryBuilder()
      .select('snapshot')
      .from(versionTableName, 'v')
      .where('v.record_id = :id AND v.version = :version', { id, version })
      .getRawOne();

    if (!versionData) {
      throw new NotFoundException('Version not found');
    }

    const snapshot = typeof versionData.snapshot === 'string' 
      ? JSON.parse(versionData.snapshot) 
      : versionData.snapshot;

    await this.schemaRepository.manager
      .createQueryBuilder()
      .update(tableName)
      .set({ ...snapshot, updated_at: new Date() })
      .where('id = :id', { id })
      .execute();

    if (userId) {
      await this.auditService.log(project.id, userId, 'update', resourceName, id, snapshot);
    }

    return this.get(projectSlug, resourceName, id);
  }

  private applyFilters(qb: SelectQueryBuilder<any>, filters: string, resourceName?: string): void {
    // 如果提供了 resourceName，验证字段属于该资源
    if (resourceName) {
      const filterArray = filters.split('&');
      const validFields = /^[a-z_]+$/;
      
      for (const filter of filterArray) {
        const [field] = filter.split(':');
        if (!validFields.test(field)) {
          throw new Error(`Invalid filter field: ${field}`);
        }
      }
    }
    
    const filterArray = filters.split('&');
    filterArray.forEach((filter) => {
      const [field, operator, value] = filter.split(':');
      switch (operator) {
        case 'eq':
          qb.andWhere(`${qb.alias}.${field} = :${field}`, { [field]: value });
          break;
        case 'neq':
          qb.andWhere(`${qb.alias}.${field} != :${field}`, { [field]: value });
          break;
        case 'like':
          qb.andWhere(`${qb.alias}.${field} LIKE :${field}`, { [field]: `%${value}%` });
          break;
        case 'gte':
          qb.andWhere(`${qb.alias}.${field} >= :${field}`, { [field]: value });
          break;
        case 'lte':
          qb.andWhere(`${qb.alias}.${field} <= :${field}`, { [field]: value });
          break;
        case 'in':
          qb.andWhere(`${qb.alias}.${field} IN (:...${field})`, { [field]: value.split(',') });
          break;
      }
    });
  }

  private applySorting(qb: SelectQueryBuilder<any>, sort: string, resourceName?: string): void {
    const sortFields = sort.split(',');
    
    // 如果提供了 resourceName，验证字段格式
    if (resourceName) {
      const validFieldPattern = /^[a-z_]+$/;
      for (const field of sortFields) {
        const fieldName = field.startsWith('-') ? field.slice(1) : field;
        if (!validFieldPattern.test(fieldName)) {
          throw new Error(`Invalid sort field: ${fieldName}`);
        }
      }
    }
    
    sortFields.forEach((field) => {
      const direction = field.startsWith('-') ? 'DESC' : 'ASC';
      const fieldName = field.startsWith('-') ? field.slice(1) : field;
      qb.addOrderBy(`${qb.alias}.${fieldName}`, direction);
    });
  }
}