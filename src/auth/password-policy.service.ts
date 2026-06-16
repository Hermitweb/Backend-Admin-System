import { Injectable, BadRequestException } from '@nestjs/common';

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  score: number;
}

@Injectable()
export class PasswordPolicyService {
  private readonly MIN_LENGTH = 8;
  private readonly REQUIRE_UPPERCASE = true;
  private readonly REQUIRE_LOWERCASE = true;
  private readonly REQUIRE_NUMBER = true;
  private readonly REQUIRE_SPECIAL = false;
  private readonly COMMON_PASSWORDS = [
    'password', '123456', 'admin', 'welcome', 'letmein',
    'monkey', 'dragon', 'master', 'admin123', 'password1',
    'qwerty', 'login', 'abc123', '111111', '000000'
  ];
  
  validate(password: string): PasswordValidationResult {
    const errors: string[] = [];
    let score = 0;
    
    if (!password || password.length < this.MIN_LENGTH) {
      errors.push(`密码长度必须至少 ${this.MIN_LENGTH} 个字符`);
    } else {
      score += Math.min(password.length * 2, 20);
    }
    
    if (this.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push('密码必须包含至少一个大写字母');
    } else {
      score += 10;
    }
    
    if (this.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push('密码必须包含至少一个小写字母');
    } else {
      score += 10;
    }
    
    if (this.REQUIRE_NUMBER && !/\d/.test(password)) {
      errors.push('密码必须包含至少一个数字');
    } else {
      score += 10;
    }
    
    if (this.REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('密码必须包含至少一个特殊字符');
    } else if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 10;
    }
    
    const lowerPassword = password.toLowerCase();
    if (this.COMMON_PASSWORDS.some(common => lowerPassword.includes(common))) {
      errors.push('密码过于简单，容易被破解');
    } else {
      score += 15;
    }
    
    if (this.hasSequentialChars(password)) {
      errors.push('密码不能包含连续字符（如 abc、123）');
    }
    
    if (this.hasRepeatedChars(password)) {
      errors.push('密码不能包含重复字符（如 aaa、111）');
    } else {
      score += 10;
    }
    
    score = Math.min(score, 100);
    
    return {
      valid: errors.length === 0,
      errors,
      score,
    };
  }
  
  throwIfInvalid(password: string): void {
    const result = this.validate(password);
    if (!result.valid) {
      throw new BadRequestException({
        message: '密码不符合安全要求',
        errors: result.errors,
        score: result.score,
      });
    }
  }
  
  getScoreLabel(score: number): { label: string; color: string } {
    if (score < 40) return { label: '弱', color: 'danger' };
    if (score < 60) return { label: '中等', color: 'warning' };
    if (score < 80) return { label: '强', color: 'info' };
    return { label: '非常强', color: 'success' };
  }
  
  private hasSequentialChars(password: string): boolean {
    const lower = password.toLowerCase();
    for (let i = 0; i < lower.length - 2; i++) {
      const char1 = lower.charCodeAt(i);
      const char2 = lower.charCodeAt(i + 1);
      const char3 = lower.charCodeAt(i + 2);
      if ((char2 === char1 + 1 && char3 === char2 + 1) ||
          (char2 === char1 - 1 && char3 === char2 - 1)) {
        return true;
      }
    }
    return false;
  }
  
  private hasRepeatedChars(password: string): boolean {
    for (let i = 0; i < password.length - 2; i++) {
      if (password[i] === password[i + 1] && password[i + 1] === password[i + 2]) {
        return true;
      }
    }
    return false;
  }
}
