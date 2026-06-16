import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';
import { ProjectGuard } from './project.guard';
import { User } from '../entity/user.entity';
import { ProjectMember } from '../entity/project-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ProjectMember]),
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: configService.get('JWT_EXPIRES_IN') },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy, RolesGuard, ProjectGuard],
  controllers: [AuthController],
  exports: [AuthService, RolesGuard, ProjectGuard],
})
export class AuthModule {}