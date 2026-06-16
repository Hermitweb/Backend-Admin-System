import { IsEmail, IsOptional } from 'class-validator';
import { UserRole } from '../../entity/user.entity';

export class UpdateUserDto {
  @IsOptional()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  avatar?: string;

  @IsOptional()
  password?: string;

  @IsOptional()
  status?: 'active' | 'inactive';

  @IsOptional()
  role?: UserRole;
}