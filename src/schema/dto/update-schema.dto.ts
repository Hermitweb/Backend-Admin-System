import { IsOptional } from 'class-validator';

export class UpdateSchemaDto {
  @IsOptional()
  display_name?: string;

  @IsOptional()
  definition?: Record<string, any>;
}