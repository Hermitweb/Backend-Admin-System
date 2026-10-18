import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as fs from 'fs';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      // Changed from Header Bearer Token to HttpOnly Cookie extraction
      jwtFromRequest: ExtractJwt.fromCookieNames(['access_token']),
      ignoreExpiration: false,
      secretOrKey: configService.get('RSA_PUBLIC_KEY') || fs.readFileSync(process.env.RSA_PUBLIC_KEY_PATH || './keys/public.key', 'utf8'),
      algorithms: ['RS256'], // Explicitly specify RS256 algorithm
    });
  }

  async validate(payload: any) {
    // Enhanced validation response
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      projects: payload.projects || [],
      iat: payload.iat,
      exp: payload.exp,
    };
  }
}