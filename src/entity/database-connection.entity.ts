import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type DatabaseType = 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'redis' | 'elasticsearch' | 'influxdb' | 'neo4j' | 'cassandra' | 'cockroachdb' | 'tidb' | 'milvus' | 'arangodb';
export type ConnectionStatus = 'connected' | 'disconnected' | 'error';

@Entity('database_connections')
export class DatabaseConnection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  project_id: string;

  @Column({ length: 128 })
  name: string;

  @Column({ length: 32 })
  type: DatabaseType;

  @Column({ length: 256 })
  host: string;

  @Column({ type: 'int', nullable: true })
  port: number;

  @Column({ length: 128 })
  database: string;

  @Column({ length: 128, nullable: true })
  username: string;

  @Column({ length: 256, nullable: true })
  password: string;

  @Column({ type: 'varchar', length: 16, default: 'disconnected' })
  status: ConnectionStatus;

  @Column({ type: 'text', nullable: true })
  last_error: string;

  @Column({ type: 'datetime', nullable: true })
  last_checked_at: Date;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'text', nullable: true })
  options: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}