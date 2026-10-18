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
import { DeviceFingerprint } from '../entity/device-fingerprint.entity';
import { RSAKeyGenerator } from './rsa-key.generator';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ProjectMember, DeviceFingerprint]),
    PassportModule,
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => {
        const rsaKeyGenerator = new RSAKeyGenerator();
        await rsaKeyGenerator.ensureKeysExist();
        
        return {
          privateKey: configService.get('RSA_PRIVATE_KEY') || rsaKeyGenerator.getPrivateKey(),
          publicKey: configService.get('RSA_PUBLIC_KEY') || rsaKeyGenerator.getPublicKey(),
          signOptions: {
            expiresIn: configService.get('JWT_EXPIRES_IN') || '1h',
            algorithm: 'RS256',
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy, RolesGuard, ProjectGuard, RSAKeyGenerator],
  controllers: [AuthController],
  exports: [AuthService, RolesGuard, ProjectGuard],
})
export class AuthModule {}