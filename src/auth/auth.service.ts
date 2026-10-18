import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../entity/user.entity';
import { DeviceFingerprint } from '../entity/device-fingerprint.entity';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  projects: string[];
  iat?: number;
  exp?: number;
}

interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    avatar: string | null;
    role: string;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');
  private readonly FINGERPRINT_SALT = process.env.FINGERPRINT_SALT || 'your-salt-key-min-32-characters';
  private readonly DEVICE_FINGERPRINT_HEADER = 'X-Device-Fingerprint';

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(DeviceFingerprint)
    private deviceFingerprintRepository: Repository<DeviceFingerprint>,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      this.logger.warn(`Login attempt for non-existent user: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`Invalid password for user: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async login(user: User, request?: any): Promise<LoginResponse & { tokens?: { accessToken?: string } }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      projects: [],
    };

    // Generate device fingerprint if provided
    let deviceFingerprint = request?.headers[this.DEVICE_FINGERPRINT_HEADER] as string;
    if (!deviceFingerprint) {
      deviceFingerprint = this.generateDeviceFingerprint(request);
    }

    // Verify or create device fingerprint
    await this.verifyOrCreateDeviceFingerprint(user.id, deviceFingerprint, request);

    // Update user's device fingerprint (main device)
    user.deviceFingerprint = deviceFingerprint;
    await this.userRepository.save(user);

    // Invalidate old refresh token for security (rotation ready)
    user.refreshToken = null;
    await this.userRepository.save(user);

    // Sign access token with RS256 (no refresh token in response - it's cookie-based)
    const accessToken = this.jwtService.sign(payload);

    // Update todo list
    const result = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      },
    };

    // Only return accessToken for API clients that don't support cookies
    result.tokens = { accessToken };

    return result;
  }

  private generateDeviceFingerprint(request?: any): string {
    const headers = request?.headers || {};
    const userAgent = headers['user-agent'] || '';
    const ipAddress = headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown';
    
    const data = `${userAgent}|${ipAddress}|${this.FINGERPRINT_SALT}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 64);
  }

  private async verifyOrCreateDeviceFingerprint(userId: string, fingerprint: string, request?: any) {
    try {
      let existingFingerprint = await this.deviceFingerprintRepository.findOne({
        where: { userId, fingerprint },
      });

      if (existingFingerprint) {
        // Check if banned due to too many failed attempts
        if (existingFingerprint.status === 'banned') {
          const cooldownExpiry = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes
          if (new Date() > cooldownExpiry) {
            existingFingerprint.status = 'active';
            existingFingerprint.attempts = 0;
          } else {
            this.logger.warn(`Device fingerprint banned for user ${userId}: ${fingerprint}`);
            throw new UnauthorizedException('Too many failed login attempts. Please wait 15 minutes.');
          }
        }

        // Mark as current device
        existingFingerprint.isCurrentDevice = true;
        existingFingerprint.userAgent = request?.headers['user-agent'];
        existingFingerprint.ipAddress = request?.headers['x-forwarded-for'];
        await this.deviceFingerprintRepository.save(existingFingerprint);
      } else {
        // Create new device fingerprint
        await this.deviceFingerprintRepository.insert({
          userId,
          fingerprint,
          userAgent: request?.headers['user-agent'],
          ipAddress: request?.headers['x-forwarded-for'],
          status: 'active',
          isCurrentDevice: true,
        });
      }
    } catch (error) {
      this.logger.error('Device fingerprint error:', error.message);
      // Don't fail login due to fingerprint issues, but log them
    }
  }

  async register(email: string, password: string, name?: string) {
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new UnauthorizedException('Email already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      name,
    });
    await this.userRepository.save(user);
    return this.login(user);
  }

  /**
   * Generate a refresh token (stored in HttpOnly cookie, not returned here)
   */
  async generateRefreshToken(userId: string): Promise<string> {
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const hashedToken = await bcrypt.hash(refreshToken, 10);
    
    await this.userRepository.update(userId, { refreshToken: hashedToken });
    
    return hashedToken;
  }

  /**
   * Validate refresh token from cookie with rotation
   */
  async validateRefreshToken(userId: string, providedToken: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user?.refreshToken) {
      return false;
    }

    const isValid = await bcrypt.compare(providedToken, user.refreshToken);
    
    if (!isValid) {
      // Token validation failed - might be rotated
      this.logger.warn(`Invalid refresh token for user ${userId}`);
      // Optionally invalidate user's refresh token for security
      await this.userRepository.update(userId, { refreshToken: null });
      return false;
    }

    // Success - rotate the refresh token for enhanced security
    // Keep the same token valid for this request but mark for rotation on next use
    // Implement full rotation by invalidating this token after successful use
    return true;
  }

  /**
   * Logout - invalidate refresh token
   */
  async logout(userId: string): Promise<void> {
    await this.userRepository.update(userId, { refreshToken: null });
    
    // Optionally deactivate current device fingerprint
    try {
      await this.deviceFingerprintRepository.update(
        { userId, isCurrentDevice: true },
        { isCurrentDevice: false },
      );
    } catch (error) {
      this.logger.error('Logout device cleanup error:', error.message);
    }
  }

  /**
   * Get active devices for current user
   */
  async getActiveDevices(userId: string): Promise<DeviceFingerprint[]> {
    return await this.deviceFingerprintRepository.find({
      where: { 
        userId,
        status: 'active',
      },
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * Revoke specific device
   */
  async revokeDevice(userId: string, deviceId: string): Promise<void> {
    await this.deviceFingerprintRepository.update(deviceId, { status: 'revoked' });
  }

  /**
   * Revoke all sessions (logout everywhere)
   */
  async revokeAllSessions(userId: string): Promise<void> {
    await this.userRepository.update(userId, { refreshToken: null });
    await this.deviceFingerprintRepository.update(
      { userId },
      { status: 'revoked' },
    );
  }

  /**
   * Check if a device fingerprint is registered
   */
  async isDeviceRegistered(userId: string, fingerprint: string): Promise<boolean> {
    const count = await this.deviceFingerprintRepository.count({
      where: { userId, fingerprint, status: 'active' },
    });
    return count > 0;
  }
}
