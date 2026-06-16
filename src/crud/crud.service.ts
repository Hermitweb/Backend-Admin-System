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

    const sanitizedSlug = projectSlug.replace(/-/g, '_');
    const tableName = `project_${sanitizedSlug}_${resourceName}`;
    
    const dataSource = await this.getDataSource(project.id);
    const qb = dataSource
      .createQueryBuilder()
      .select('*')
      .from(tableName, resourceName);

    if (query.filter) {
      this.applyFilters(qb, query.filter);
    }

    if (query.sort) {
      this.applySorting(qb, query.sort);
    }

    if (query.fields) {
      const fields = query.fields.split(',');
      qb.select(fields.map(f => `${resourceName}.${f}`));
    }

    const data = await qb.skip(skip).take(pageSize).getRawMany();
    
    const countQb = dataSource
      .createQueryBuilder()
      .select('COUNT(*) as count')
      .from(tableName, resourceName);

    if (query.filter) {
      this.applyFilters(countQb, query.filter);
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

  async get(projectSlug: string, resourceName: string, id: string): Promise<any> {
    const project = await this.projectService.findBySlug(projectSlug);
    const schema = await this.schemaRepository.findOne({
      where: { project_id: project.id, name: resourceName },
    });

    if (!schema) {
      throw new NotFoundException('Resource not found');
    }

    const sanitizedSlug = projectSlug.replace(/-/g, '_');
    const tableName = `project_${sanitizedSlug}_${resourceName}`;
    const dataSource = await this.getDataSource(project.id);
    const result = await dataSource
      .createQueryBuilder()
      .select('*')
      .from(tableName, resourceName)
      .where(`${resourceName}.id = :id`, { id })
      .getRawOne();

    if (!result) {
      throw new NotFoundException('Record not found');
    }

    return result;
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

    const sanitizedSlug = projectSlug.replace(/-/g, '_');
    const tableName = `project_${sanitizedSlug}_${resourceName}`;
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

    const sanitizedSlug = projectSlug.replace(/-/g, '_');
    const tableName = `project_${sanitizedSlug}_${resourceName}`;
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

    const sanitizedSlug = projectSlug.replace(/-/g, '_');
    const tableName = `project_${sanitizedSlug}_${resourceName}`;
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

    const sanitizedSlug = projectSlug.replace(/-/g, '_');
    const tableName = `project_${sanitizedSlug}_${resourceName}`;
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

    const sanitizedSlug = projectSlug.replace(/-/g, '_');
    const tableName = `project_${sanitizedSlug}_${resourceName}`;
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

    const sanitizedSlug = projectSlug.replace(/-/g, '_');
    const versionTableName = `project_${sanitizedSlug}_${resourceName}_versions`;
    
    const exists = await this.schemaRepository.manager.query(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='project_${sanitizedSlug}_${resourceName}_versions'`,
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

    const sanitizedSlug = projectSlug.replace(/-/g, '_');
    const versionTableName = `project_${sanitizedSlug}_${resourceName}_versions`;
    
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

    const sanitizedSlug = projectSlug.replace(/-/g, '_');
    const versionTableName = `project_${sanitizedSlug}_${resourceName}_versions`;
    const tableName = `project_${sanitizedSlug}_${resourceName}`;

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

  private applyFilters(qb: SelectQueryBuilder<any>, filters: string): void {
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

  private applySorting(qb: SelectQueryBuilder<any>, sort: string): void {
    const sortFields = sort.split(',');
    sortFields.forEach((field) => {
      const direction = field.startsWith('-') ? 'DESC' : 'ASC';
      const fieldName = field.startsWith('-') ? field.slice(1) : field;
      qb.addOrderBy(`${qb.alias}.${fieldName}`, direction);
    });
  }
}