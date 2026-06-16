import { IsNotEmpty, IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { DatabaseType } from '../../entity/database-connection.entity';

export class CreateDatabaseConnectionDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEnum(['postgresql', 'mysql', 'sqlite', 'mongodb', 'redis', 'elasticsearch', 'influxdb', 'neo4j', 'cassandra', 'cockroachdb', 'tidb', 'milvus', 'arangodb'])
  type: DatabaseType;

  @IsNotEmpty()
  @IsString()
  host: string;

  @IsOptional()
  @IsNumber()
  port: number;

  @IsNotEmpty()
  @IsString()
  database: string;

  @IsOptional()
  @IsString()
  username: string;

  @IsOptional()
  @IsString()
  password: string;

  @IsOptional()
  options: Record<string, any>;
}