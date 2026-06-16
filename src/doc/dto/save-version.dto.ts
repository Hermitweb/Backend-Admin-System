import { IsNotEmpty } from 'class-validator';

export class SaveVersionDto {
  @IsNotEmpty()
  version: string;
}