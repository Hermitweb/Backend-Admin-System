import { IsOptional } from 'class-validator';

export class UpdateLinkRuleDto {
  @IsOptional()
  link_mode?: 'read_only' | 'read_write' | 'sync';

  @IsOptional()
  field_mapping?: Record<string, any>;

  @IsOptional()
  conflict_strategy?: 'source_wins' | 'target_wins' | 'merge' | 'error';

  @IsOptional()
  enabled?: boolean;
}