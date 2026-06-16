import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateProjectDto {
  @IsNotEmpty()
  slug: string;

  @IsNotEmpty()
  name: string;

  @IsOptional()
  description?: string;

  @IsOptional()
  isolation?: 'strict' | 'linked';
}