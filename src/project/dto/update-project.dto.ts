import { IsOptional } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  name?: string;

  @IsOptional()
  description?: string;

  @IsOptional()
  status?: 'active' | 'suspended' | 'archived';

  @IsOptional()
  isolation?: 'strict' | 'linked';

  @IsOptional()
  config?: Record<string, any>;
}