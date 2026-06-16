import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/v1/settings')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  @Roles('super_admin', 'admin')
  async getAll() {
    return this.settingsService.getAll();
  }

  @Get('keys')
  @Roles('super_admin', 'admin')
  async getByKeys(@Body() body: { keys: string[] }) {
    return this.settingsService.getByKeys(body.keys);
  }

  @Get(':key')
  @Roles('super_admin', 'admin')
  async getByKey(@Param('key') key: string) {
    return this.settingsService.getByKey(key);
  }

  @Post()
  @Roles('super_admin')
  async upsert(@Body() body: { key: string; value: string; description?: string }) {
    return this.settingsService.upsert(body.key, body.value, body.description);
  }

  @Post('batch')
  @Roles('super_admin')
  async batchUpsert(@Body() body: { settings: { key: string; value: string; description?: string }[] }) {
    return this.settingsService.batchUpsert(body.settings);
  }

  @Delete(':key')
  @Roles('super_admin')
  async delete(@Param('key') key: string) {
    await this.settingsService.delete(key);
    return { message: 'Setting deleted successfully' };
  }
}
