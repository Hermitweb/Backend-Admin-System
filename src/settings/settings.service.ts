import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../entity/system-setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private settingRepository: Repository<SystemSetting>,
  ) {}

  async getAll(): Promise<SystemSetting[]> {
    return this.settingRepository.find();
  }

  async getByKey(key: string): Promise<SystemSetting> {
    const setting = await this.settingRepository.findOne({ where: { key } });
    if (!setting) {
      throw new NotFoundException(`Setting '${key}' not found`);
    }
    return setting;
  }

  async getByKeys(keys: string[]): Promise<Record<string, string>> {
    const settings = await this.settingRepository.find({
      where: keys.map(key => ({ key })),
    });
    const result: Record<string, string> = {};
    settings.forEach(s => {
      result[s.key] = s.value;
    });
    return result;
  }

  async upsert(key: string, value: string, description?: string): Promise<SystemSetting> {
    let setting = await this.settingRepository.findOne({ where: { key } });
    
    if (setting) {
      setting.value = value;
      if (description !== undefined) {
        setting.description = description;
      }
    } else {
      setting = this.settingRepository.create({
        key,
        value,
        description: description || '',
      });
    }
    
    return this.settingRepository.save(setting);
  }

  async batchUpsert(settings: { key: string; value: string; description?: string }[]): Promise<SystemSetting[]> {
    const results: SystemSetting[] = [];
    for (const s of settings) {
      const result = await this.upsert(s.key, s.value, s.description);
      results.push(result);
    }
    return results;
  }

  async delete(key: string): Promise<void> {
    const setting = await this.getByKey(key);
    await this.settingRepository.remove(setting);
  }

  async initializeDefaults(): Promise<void> {
    const defaults = [
      { key: 'api_url', value: 'http://localhost:3000', description: 'API 地址' },
      { key: 'jwt_expire', value: '3600', description: 'JWT 过期时间(秒)' },
      { key: 'max_upload_size', value: '10', description: '最大上传大小(MB)' },
      { key: 'system_name', value: '管理后台', description: '系统名称' },
      { key: 'system_logo', value: 'Admin System', description: '系统Logo文字' },
      { key: 'enable_registration', value: 'true', description: '是否允许注册' },
      { key: 'maintenance_mode', value: 'false', description: '维护模式' },
    ];

    for (const def of defaults) {
      await this.upsert(def.key, def.value, def.description);
    }
  }
}
