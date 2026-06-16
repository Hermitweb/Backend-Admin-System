import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../entity/user.entity';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  status?: 'active' | 'inactive';

  @IsOptional()
  role?: UserRole;
}