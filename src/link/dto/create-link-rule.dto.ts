import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateLinkRuleDto {
  @IsNotEmpty()
  source_project: string;

  @IsNotEmpty()
  target_project: string;

  @IsNotEmpty()
  resource_type: string;

  @IsOptional()
  link_mode?: 'read_only' | 'read_write' | 'sync';

  @IsOptional()
  field_mapping?: Record<string, any>;

  @IsOptional()
  conflict_strategy?: 'source_wins' | 'target_wins' | 'merge' | 'error';
}