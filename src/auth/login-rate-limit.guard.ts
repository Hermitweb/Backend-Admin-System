import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request } from 'express';

interface LoginAttempt {
  count: number;
  lockedUntil: number;
}

@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  private readonly attempts = new Map<string, LoginAttempt>();
  private readonly logger = new Logger('LoginRateLimit');
  
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCK_DURATION = 15 * 60 * 1000;
  private readonly WINDOW_DURATION = 5 * 60 * 1000;

  canActivate(context: ExecutionContext): boolean {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    const email = (request.body as any)?.email || '';
    
    const key = `${ip}:${email}`;
    const now = Date.now();
    const attempt = this.attempts.get(key);
    
    if (attempt && attempt.lockedUntil > now) {
      const remainingMinutes = Math.ceil((attempt.lockedUntil - now) / 60000);
      throw new HttpException({
        message: `登录尝试次数过多，请在 ${remainingMinutes} 分钟后重试`,
        retryAfter: Math.ceil((attempt.lockedUntil - now) / 1000),
      }, HttpStatus.TOO_MANY_REQUESTS);
    }
    
    if (!attempt || now - (attempt.lockedUntil || 0) > this.WINDOW_DURATION) {
      this.attempts.set(key, { count: 1, lockedUntil: 0 });
      return true;
    }
    
    attempt.count++;
    
    if (attempt.count >= this.MAX_ATTEMPTS) {
      attempt.lockedUntil = now + this.LOCK_DURATION;
      this.logger.warn(`Login locked for ${key} after ${attempt.count} attempts`);
      throw new HttpException({
        message: `登录尝试次数过多，账户已锁定 ${this.LOCK_DURATION / 60000} 分钟`,
        retryAfter: this.LOCK_DURATION / 1000,
      }, HttpStatus.TOO_MANY_REQUESTS);
    }
    
    return true;
  }
  
  resetAttempt(ip: string, email: string): void {
    const key = `${ip}:${email}`;
    this.attempts.delete(key);
  }
  
  getAttemptsCount(ip: string, email: string): number {
    const key = `${ip}:${email}`;
    return this.attempts.get(key)?.count || 0;
  }
}
