import { IsOptional, IsString, IsNumber, IsEnum, IsBoolean } from 'class-validator';
import { DatabaseType } from '../../entity/database-connection.entity';

export class UpdateDatabaseConnectionDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(['postgresql', 'mysql', 'sqlite', 'mongodb', 'redis', 'elasticsearch', 'influxdb', 'neo4j', 'cassandra', 'cockroachdb', 'tidb', 'milvus', 'arangodb'])
  type: DatabaseType;

  @IsOptional()
  @IsString()
  host: string;

  @IsOptional()
  @IsNumber()
  port: number;

  @IsOptional()
  @IsString()
  database: string;

  @IsOptional()
  @IsString()
  username: string;

  @IsOptional()
  @IsString()
  password: string;

  @IsOptional()
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  options: Record<string, any>;
}