import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatabaseConnection, DatabaseType, ConnectionStatus } from '../entity/database-connection.entity';
import { CreateDatabaseConnectionDto } from './dto/create-database-connection.dto';
import { UpdateDatabaseConnectionDto } from './dto/update-database-connection.dto';
import { ProjectService } from '../project/project.service';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DatabaseService {
  constructor(
    @InjectRepository(DatabaseConnection)
    private connectionRepository: Repository<DatabaseConnection>,
    private projectService: ProjectService,
  ) {}

  async create(projectSlug: string, dto: CreateDatabaseConnectionDto): Promise<DatabaseConnection> {
    const project = await this.projectService.findBySlug(projectSlug);
    
    const connection = this.connectionRepository.create({
      project_id: project.id,
      name: dto.name,
      type: dto.type,
      host: dto.host,
      port: dto.port || 0,
      database: dto.database,
      username: dto.username || '',
      password: dto.password || '',
      options: dto.options ? JSON.stringify(dto.options) : '',
    });

    return this.connectionRepository.save(connection);
  }

  async findByProject(projectSlug: string): Promise<DatabaseConnection[]> {
    const project = await this.projectService.findBySlug(projectSlug);
    return this.connectionRepository.find({
      where: { project_id: project.id },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(projectSlug: string, id: string): Promise<DatabaseConnection> {
    const project = await this.projectService.findBySlug(projectSlug);
    const connection = await this.connectionRepository.findOne({
      where: { id, project_id: project.id },
    });

    if (!connection) {
      throw new NotFoundException('Database connection not found');
    }

    return connection;
  }

  async update(projectSlug: string, id: string, dto: UpdateDatabaseConnectionDto): Promise<DatabaseConnection> {
    const connection = await this.findOne(projectSlug, id);
    
    if (dto.name !== undefined) connection.name = dto.name;
    if (dto.type !== undefined) connection.type = dto.type;
    if (dto.host !== undefined) connection.host = dto.host;
    if (dto.port !== undefined) connection.port = dto.port;
    if (dto.database !== undefined) connection.database = dto.database;
    if (dto.username !== undefined) connection.username = dto.username;
    if (dto.password !== undefined) connection.password = dto.password;
    if (dto.enabled !== undefined) connection.enabled = dto.enabled;
    if (dto.options !== undefined) connection.options = JSON.stringify(dto.options);
    
    return this.connectionRepository.save(connection);
  }

  async delete(projectSlug: string, id: string): Promise<void> {
    const connection = await this.findOne(projectSlug, id);
    await this.connectionRepository.remove(connection);
  }

  async testConnection(projectSlug: string, id: string): Promise<{ success: boolean; message: string }> {
    const connection = await this.findOne(projectSlug, id);
    return this.performConnectionTest(connection);
  }

  async testNewConnection(dto: CreateDatabaseConnectionDto): Promise<{ success: boolean; message: string }> {
    const mockConnection: DatabaseConnection = {
      id: 'test',
      project_id: 'test',
      name: dto.name,
      type: dto.type,
      host: dto.host,
      port: dto.port || 0,
      database: dto.database,
      username: dto.username || '',
      password: dto.password || '',
      status: 'disconnected',
      last_error: null,
      last_checked_at: null,
      enabled: true,
      options: '',
      created_at: new Date(),
      updated_at: new Date(),
    };
    return this.performConnectionTest(mockConnection);
  }

  async performConnectionTest(connection: DatabaseConnection): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      const type = connection.type;
      const host = connection.host;
      const port = connection.port;

      if (type === 'sqlite') {
        const dbPath = connection.database || '';
        const fullPath = path.isAbsolute(dbPath) 
          ? dbPath 
          : path.join(process.cwd(), dbPath);
        
        try {
          fs.accessSync(fullPath, fs.constants.R_OK | fs.constants.W_OK);
          resolve({ 
            success: true, 
            message: `SQLite 数据库文件存在且可读写 (${fullPath})` 
          });
        } catch {
          resolve({ 
            success: false, 
            message: `SQLite 数据库文件不存在或无法访问 (${fullPath})` 
          });
        }
        return;
      }

      if (!port) {
        resolve({ success: false, message: '端口未配置' });
        return;
      }

      const socket = new net.Socket();
      let timeout: NodeJS.Timeout;

      socket.on('connect', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({ success: true, message: `成功连接到 ${host}:${port}` });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ success: false, message: `连接超时: ${host}:${port}` });
      });

      socket.on('error', (err: Error) => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({ success: false, message: `连接失败: ${err.message}` });
      });

      socket.setTimeout(5000);
      socket.connect(port, host);
    });
  }

  async refreshStatus(projectSlug: string): Promise<DatabaseConnection[]> {
    const connections = await this.findByProject(projectSlug);
    
    for (const connection of connections) {
      const result = await this.performConnectionTest(connection);
      connection.status = result.success ? 'connected' : 'error';
      connection.last_error = result.success ? null : result.message;
      connection.last_checked_at = new Date();
      await this.connectionRepository.save(connection);
    }

    return this.findByProject(projectSlug);
  }
}