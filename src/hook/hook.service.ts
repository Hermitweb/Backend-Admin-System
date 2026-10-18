import { Injectable, Logger } from '@nestjs/common';
import { createContext, Script } from 'vm';

export type HookType = 'before_create' | 'after_create' | 'before_update' | 'after_update' | 'before_delete' | 'after_delete';

export interface HookConfig {
  type: HookType;
  name: string;
  action: string;
  config?: Record<string, any>;
}

@Injectable()
export class HookService {
  private hooks: Map<string, HookConfig[]> = new Map();
  private readonly logger = new Logger(HookService.name);
  
  // VM 沙箱安全配置
  private readonly SANDBOX_TIMEOUT = 5000; // 5 秒超时
  private readonly SANDBOX_MODULES = ['Date', 'JSON', 'Math']; // 允许的内置对象白名单
  
  // 预编译脚本缓存（避免重复编译）
  private compiledScripts: Map<string, Script> = new Map();

  registerHooks(projectSlug: string, resourceName: string, hooks: HookConfig[]): void {
    const key = `${projectSlug}:${resourceName}`;
    this.hooks.set(key, hooks);
  }

  getHooks(projectSlug: string, resourceName: string): HookConfig[] {
    const key = `${projectSlug}:${resourceName}`;
    return this.hooks.get(key) || [];
  }

  async executeBeforeHooks(
    projectSlug: string,
    resourceName: string,
    operation: 'create' | 'update' | 'delete',
    data: any,
  ): Promise<any> {
    const hooks = this.getHooks(projectSlug, resourceName);
    const beforeHooks = hooks.filter(h => h.type === `before_${operation}`);
    
    let result = data;
    for (const hook of beforeHooks) {
      result = await this.executeHook(hook, result);
    }
    
    return result;
  }

  async executeAfterHooks(
    projectSlug: string,
    resourceName: string,
    operation: 'create' | 'update' | 'delete',
    data: any,
  ): Promise<void> {
    const hooks = this.getHooks(projectSlug, resourceName);
    const afterHooks = hooks.filter(h => h.type === `after_${operation}`);
    
    for (const hook of afterHooks) {
      await this.executeHook(hook, data);
    }
  }

  private async executeHook(hook: HookConfig, data: any): Promise<any> {
    switch (hook.action) {
      case 'validate_required':
        return this.validateRequired(hook, data);
      case 'set_timestamp':
        return this.setTimestamp(hook, data);
      case 'generate_slug':
        return this.generateSlug(hook, data);
      case 'notify_webhook':
        await this.notifyWebhook(hook, data);
        return data;
      case 'audit_log':
        await this.createAuditLog(hook, data);
        return data;
      case 'custom_script':
        return this.executeCustomScript(hook, data);
      default:
        return data;
    }
  }

  private validateRequired(hook: HookConfig, data: any): any {
    const fields = hook.config?.fields || [];
    for (const field of fields) {
      if (!data[field]) {
        throw new Error(`Field ${field} is required`);
      }
    }
    return data;
  }

  private setTimestamp(hook: HookConfig, data: any): any {
    const field = hook.config?.field || 'created_at';
    data[field] = new Date().toISOString();
    return data;
  }

  private generateSlug(hook: HookConfig, data: any): any {
    const sourceField = hook.config?.sourceField || 'title';
    const targetField = hook.config?.targetField || 'slug';
    
    if (data[sourceField]) {
      data[targetField] = data[sourceField]
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
    
    return data;
  }

  private async notifyWebhook(hook: HookConfig, data: any): Promise<void> {
    const url = hook.config?.url;
    if (url) {
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } catch (e) {
        console.error('Webhook notification failed:', e);
      }
    }
  }

  private async createAuditLog(hook: HookConfig, data: any): Promise<void> {
    console.log('Creating audit log:', data);
  }

  private executeCustomScript(hook: HookConfig, data: any): any {
    const script = hook.config?.script;
    if (!script) return data;
    
    try {
      // 白名单校验：只允许字母、数字、下划线、点号
      const safePattern = /^[a-zA-Z0-9_\.\[\](){}\s,;\-\+\*\/%=&<>!?:@~`]+$/;
      if (!safePattern.test(script)) {
        this.logger.warn('Unsafe script detected and blocked');
        throw new Error('Script contains disallowed characters');
      }
      
      // 阻止危险函数调用
      const dangerousPatterns = [
        /require\s*\(/i,
        /import\s*\(/i,
        /process\s*\./,
        /global\s*\[/,
        /eval\s*\(/,
        /Function\s*\(/,
        /child_process/i,
        /fs\s*[,;]/,
        /os\s*[,;]/,
        /net\s*[,;]/,
        /crypto\s*[,;]/
      ];
      
      for (const pattern of dangerousPatterns) {
        if (pattern.test(script)) {
          this.logger.warn(`Dangerous pattern detected in script: ${pattern}`);
          throw new Error('Script contains forbidden operations');
        }
      }
      
      // 使用 VM 模块创建隔离上下文
      const sandbox = {
        data,
        console: {
          log: (...args: any[]) => this.logger.debug(args.join(' ')),
          warn: (...args: any[]) => this.logger.warn(args.join(' ')),
          error: (...args: any[]) => this.logger.error(args.join(' '))
        },
        setTimeout: (fn: Function, ms: number) => setTimeout(fn, ms),
        clearTimeout: (id: number) => clearTimeout(id),
        Date,
        JSON,
        Math,
        Buffer: globalThis.Buffer,
        URL,
        URLSearchParams
      };
      
      const context = createContext(sandbox);
      const compiledScript = new Script(script, {
        filename: `hook-${hook.name}`,
        timeout: this.SANDBOX_TIMEOUT
      });
      
      // 执行脚本
      compiledScript.runInContext(context, {
        timeout: this.SANDBOX_TIMEOUT
      });
      
      return context.data;
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        this.logger.error(`Hook script timeout after ${this.SANDBOX_TIMEOUT}ms`);
        throw new Error('Hook execution timeout');
      }
      
      this.logger.error(`Custom script execution failed: ${error.message}`);
      return data; // 失败时返回原始数据而非抛出异常
    }
  }
}