import { IsNotEmpty } from 'class-validator';

export class CreateSchemaDto {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  display_name: string;

  @IsNotEmpty()
  definition: Record<string, any>;
}