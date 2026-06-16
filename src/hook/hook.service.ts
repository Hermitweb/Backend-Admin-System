import { Injectable } from '@nestjs/common';

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
    if (script) {
      try {
        const func = new Function('data', script);
        return func(data);
      } catch (e) {
        console.error('Custom script execution failed:', e);
        return data;
      }
    }
    return data;
  }
}