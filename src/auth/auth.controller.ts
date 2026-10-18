import { Controller, Post, Body, Request } from '@nestjs/common';
import { ResponseInterceptor } from '../common/interceptors/response.interceptor';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entity/user.entity';
import { Repository } from 'typeorm';

@Controller('api/v1/auth')
@UseInterceptors(ResponseInterceptor)
export class AuthController {
  constructor(
    private authService: AuthService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Request() req: any) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    
    // Generate access token and call login service
    const result = await this.authService.login(user, req);

    // Set HttpOnly cookie for access token
    const accessToken = result.tokens?.accessToken;
    if (accessToken) {
      req.res?.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000, // 1 hour
        path: '/',
      });
    }

    return {
      code: 0,
      message: 'success',
      data: {
        user: result.user,
        // Don't return refresh token - it's set in HttpOnly cookie
        // The frontend should use the cookie automatically
      },
    };
  }

  @Post('register')
  async register(@Body(ValidationPipe) dto: RegisterDto, @Request() req: any) {
    const result = await this.authService.register(dto.email, dto.password, dto.name);
    
    // After registration, also set the cookie
    const accessToken = result.tokens?.accessToken;
    if (accessToken) {
      req.res?.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000,
        path: '/',
      });
    }

    return {
      code: 0,
      message: 'Registration successful',
      data: {
        user: result.user,
      },
    };
  }

  @Post('logout')
  async logout(@Request() req: any) {
    try {
      const userId = req.user?.userId;
      if (userId) {
        await this.authService.logout(userId);
      }
      
      // Clear the cookie
      req.res?.clearCookie('access_token', {
        path: '/',
      });

      return {
        code: 0,
        message: 'Logout successful',
        data: null,
      };
    } catch (error) {
      return {
        code: 1,
        message: 'Logout failed',
        data: null,
      };
    }
  }

  @Get('me')
  async getCurrentUser(@Request() req: any) {
    const userId = req.user?.userId;
    if (!userId) {
      return {
        code: 1,
        message: 'Not authenticated',
        data: null,
      };
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return {
        code: 1,
        message: 'User not found',
        data: null,
      };
    }

    // Remove sensitive fields
    const { password, refreshToken, deviceFingerprint, ...safeUser } = user;

    return {
      code: 0,
      message: 'success',
      data: safeUser,
    };
  }

  @Get('devices')
  async getActiveDevices(@Request() req: any) {
    const userId = req.user?.userId;
    if (!userId) {
      return {
        code: 1,
        message: 'Not authenticated',
        data: null,
      };
    }

    const devices = await this.authService.getActiveDevices(userId);

    return {
      code: 0,
      message: 'success',
      data: devices.map(device => ({
        id: device.id,
        fingerprint: device.fingerprint.substring(0, 16) + '...',
        userAgent: device.userAgent?.substring(0, 50) + '...',
        ipAddress: device.ipAddress,
        isCurrentDevice: device.isCurrentDevice,
        status: device.status,
        createdAt: device.createdAt,
        updatedAt: device.updatedAt,
      })),
    };
  }

  @Delete('devices/:deviceId')
  async revokeDevice(@Request() req: any, @Body('deviceId') deviceId: string) {
    const userId = req.user?.userId;
    if (!userId) {
      return {
        code: 1,
        message: 'Not authenticated',
        data: null,
      };
    }

    await this.authService.revokeDevice(userId, deviceId);

    return {
      code: 0,
      message: 'Device revoked successfully',
      data: null,
    };
  }

  @Post('revoke-all')
  async revokeAllSessions(@Request() req: any) {
    const userId = req.user?.userId;
    if (!userId) {
      return {
        code: 1,
        message: 'Not authenticated',
        data: null,
      };
    }

    await this.authService.revokeAllSessions(userId);
    
    // Clear all cookies
    req.res?.clearCookie('access_token', {
      path: '/',
    });

    return {
      code: 0,
      message: 'All sessions revoked',
      data: null,
    };
  }
}
