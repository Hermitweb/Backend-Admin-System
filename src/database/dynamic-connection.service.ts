import { Injectable, Logger } from '@nestjs/common';
import { DataSource, DataSourceOptions } from 'typeorm';
import { DatabaseConnection } from '../entity/database-connection.entity';

@Injectable()
export class DynamicConnectionService {
  private connections: Map<string, DataSource> = new Map();
  private readonly logger = new Logger(DynamicConnectionService.name);

  async getConnection(connection: DatabaseConnection): Promise<DataSource> {
    const connectionKey = `${connection.project_id}_${connection.id}`;
    
    if (this.connections.has(connectionKey)) {
      const existingConnection = this.connections.get(connectionKey);
      if (existingConnection.isInitialized) {
        return existingConnection;
      }
    }

    const options = this.buildConnectionOptions(connection);
    const dataSource = new DataSource(options);
    
    try {
      await dataSource.initialize();
      this.connections.set(connectionKey, dataSource);
      this.logger.log(`Database connection established: ${connection.name}`);
      return dataSource;
    } catch (error) {
      this.logger.error(`Failed to connect to database ${connection.name}: ${error.message}`);
      throw error;
    }
  }

  buildConnectionOptions(connection: DatabaseConnection): DataSourceOptions {
    const baseOptions: Record<string, any> = {
      type: connection.type,
      database: connection.database,
      synchronize: false,
      logging: false,
    };

    if (connection.type !== 'sqlite') {
      baseOptions.host = connection.host;
      if (connection.port) {
        baseOptions.port = connection.port;
      }
      if (connection.username) {
        baseOptions.username = connection.username;
      }
      if (connection.password) {
        baseOptions.password = connection.password;
      }
    }

    if (connection.options) {
      try {
        const extraOptions = JSON.parse(connection.options);
        Object.assign(baseOptions, extraOptions);
      } catch {
        // Ignore invalid JSON
      }
    }

    return baseOptions as DataSourceOptions;
  }

  async releaseConnection(connection: DatabaseConnection): Promise<void> {
    const connectionKey = `${connection.project_id}_${connection.id}`;
    const dataSource = this.connections.get(connectionKey);
    
    if (dataSource) {
      try {
        await dataSource.destroy();
        this.connections.delete(connectionKey);
        this.logger.log(`Database connection released: ${connection.name}`);
      } catch (error) {
        this.logger.error(`Failed to release connection ${connection.name}: ${error.message}`);
      }
    }
  }

  async releaseAll(): Promise<void> {
    for (const [key, dataSource] of this.connections) {
      try {
        await dataSource.destroy();
      } catch (error) {
        this.logger.error(`Failed to release connection ${key}: ${error.message}`);
      }
    }
    this.connections.clear();
  }
}