import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceSchema } from '../entity/resource-schema.entity';
import { ProjectService } from '../project/project.service';
import { CreateSchemaDto, UpdateSchemaDto } from './dto';

@Injectable()
export class SchemaService {
  constructor(
    @InjectRepository(ResourceSchema)
    private schemaRepository: Repository<ResourceSchema>,
    private projectService: ProjectService,
  ) {}

  async create(projectSlug: string, dto: CreateSchemaDto): Promise<ResourceSchema> {
    const project = await this.projectService.findBySlug(projectSlug);
    const schema = this.schemaRepository.create({
      project_id: project.id,
      ...dto,
    });

    await this.schemaRepository.save(schema);
    await this.createTable(projectSlug, dto.name, dto.definition);

    return schema;
  }

  async findByProject(projectSlug: string): Promise<ResourceSchema[]> {
    const project = await this.projectService.findBySlug(projectSlug);
    return this.schemaRepository.find({ where: { project_id: project.id } });
  }

  async findOne(projectSlug: string, schemaName: string): Promise<ResourceSchema> {
    const project = await this.projectService.findBySlug(projectSlug);
    const schema = await this.schemaRepository.findOne({
      where: { project_id: project.id, name: schemaName },
    });
    if (!schema) {
      throw new NotFoundException('Schema not found');
    }
    return schema;
  }

  async update(projectSlug: string, schemaName: string, dto: UpdateSchemaDto): Promise<ResourceSchema> {
    const schema = await this.findOne(projectSlug, schemaName);
    schema.version += 1;
    Object.assign(schema, dto);
    await this.schemaRepository.save(schema);
    
    if (dto.definition) {
      await this.alterTable(projectSlug, schemaName, dto.definition);
    }

    return schema;
  }

  async delete(projectSlug: string, schemaName: string): Promise<void> {
    const schema = await this.findOne(projectSlug, schemaName);
    await this.dropTable(projectSlug, schemaName);
    await this.schemaRepository.delete(schema.id);
  }

  async createTable(projectSlug: string, tableName: string, definition: any) {
    const sanitizedSlug = projectSlug.replace(/-/g, '_');
    const fullTableName = `project_${sanitizedSlug}_${tableName}`;

    const fields = definition.fields || [];
    const columnDefinitions = [];

    columnDefinitions.push('id TEXT PRIMARY KEY');
    columnDefinitions.push('created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
    columnDefinitions.push('updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');

    fields.forEach((field: any) => {
      const colName = `"${field.name}"`;
      let colType = this.getSqliteType(field.type);
      
      if (field.required) {
        colType += ' NOT NULL';
      }
      
      if (field.default !== undefined) {
        let defaultValue = field.default;
        if (typeof defaultValue === 'string') {
          defaultValue = `'${defaultValue}'`;
        }
        colType += ` DEFAULT ${defaultValue}`;
      }

      columnDefinitions.push(`${colName} ${colType}`);
    });

    const createTableQuery = `CREATE TABLE IF NOT EXISTS ${fullTableName} (${columnDefinitions.join(', ')})`;
    await this.schemaRepository.manager.query(createTableQuery);
  }

  private async alterTable(projectSlug: string, tableName: string, definition: any) {
    const sanitizedSlug = projectSlug.replace(/-/g, '_');
    const fullTableName = `project_${sanitizedSlug}_${tableName}`;

    const fields = definition.fields || [];
    
    const existingColumns = await this.schemaRepository.manager.query(
      `PRAGMA table_info("${fullTableName}")`
    );
    const existingColumnNames = existingColumns.map((col: any) => col.name);

    for (const field of fields) {
      if (!existingColumnNames.includes(field.name)) {
        const colName = `"${field.name}"`;
        let colType = this.getSqliteType(field.type);
        
        if (field.required) {
          colType += ' NOT NULL';
        }
        
        if (field.default !== undefined) {
          let defaultValue = field.default;
          if (typeof defaultValue === 'string') {
            defaultValue = `'${defaultValue}'`;
          }
          colType += ` DEFAULT ${defaultValue}`;
        }

        const alterQuery = `ALTER TABLE "${fullTableName}" ADD COLUMN ${colName} ${colType}`;
        await this.schemaRepository.manager.query(alterQuery);
      }
    }
  }

  private async dropTable(projectSlug: string, tableName: string) {
    const sanitizedSlug = projectSlug.replace(/-/g, '_');
    const fullTableName = `project_${sanitizedSlug}_${tableName}`;

    try {
      await this.schemaRepository.manager.query(`DROP TABLE IF EXISTS "${fullTableName}"`);
    } catch (err) {
      console.log(`Error dropping table ${tableName}:`, err.message);
    }
  }

  private getSqliteType(type: string): string {
    const typeMap: Record<string, string> = {
      string: 'TEXT',
      text: 'TEXT',
      rich_text: 'TEXT',
      integer: 'INTEGER',
      decimal: 'REAL',
      boolean: 'INTEGER',
      ulid: 'TEXT',
      uuid: 'TEXT',
      timestamp: 'DATETIME',
      date: 'DATE',
      json: 'TEXT',
      file: 'TEXT',
      array: 'TEXT',
      enum: 'TEXT',
      relation: 'TEXT',
    };
    return typeMap[type] || 'TEXT';
  }
}