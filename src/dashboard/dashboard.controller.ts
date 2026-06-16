import { Controller, Get, Post, Put, Delete, Query, Body, Param } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('api/v1/dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  async getStats() {
    const stats = await this.dashboardService.getStats();
    return {
      code: 0,
      message: 'success',
      data: stats,
    };
  }

  @Get('activities')
  async getRecentActivities(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const activities = await this.dashboardService.getRecentActivities(limitNum);
    return {
      code: 0,
      message: 'success',
      data: activities,
    };
  }

  @Get('system-status')
  async getSystemStatus() {
    const status = await this.dashboardService.getSystemStatus();
    return {
      code: 0,
      message: 'success',
      data: status,
    };
  }

  @Get('notifications')
  async getNotifications() {
    const notifications = await this.dashboardService.getNotifications();
    return {
      code: 0,
      message: 'success',
      data: notifications,
    };
  }

  @Get('notifications/unread')
  async getUnreadCount() {
    const count = await this.dashboardService.getUnreadCount();
    return {
      code: 0,
      message: 'success',
      data: count,
    };
  }

  @Put('notifications/:id/read')
  async markAsRead(@Param('id') id: string) {
    const success = await this.dashboardService.markAsRead(id);
    return {
      code: success ? 0 : 1,
      message: success ? 'success' : 'not found',
      data: { success },
    };
  }

  @Put('notifications/read-all')
  async markAllAsRead() {
    const success = await this.dashboardService.markAllAsRead();
    return {
      code: 0,
      message: 'success',
      data: { success },
    };
  }

  @Delete('notifications/:id')
  async deleteNotification(@Param('id') id: string) {
    const success = await this.dashboardService.deleteNotification(id);
    return {
      code: success ? 0 : 1,
      message: success ? 'success' : 'not found',
      data: { success },
    };
  }

  @Post('notifications')
  async createNotification(@Body() notification: any) {
    const result = await this.dashboardService.addNotification(notification);
    return {
      code: 0,
      message: 'success',
      data: result,
    };
  }
}
