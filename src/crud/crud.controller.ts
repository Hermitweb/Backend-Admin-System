import { Controller, Get, Post, Put, Delete, Body, Param, Query, Patch, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CrudService } from './crud.service';
import { ProjectRoles, ProjectGuard } from '../auth/project.guard';
import { Request } from 'express';

@Controller('api/v1/:projectSlug/api/:resourceName')
@UseGuards(AuthGuard('jwt'), ProjectGuard)
export class CrudController {
  constructor(private crudService: CrudService) {}

  @Get()
  @ProjectRoles('admin', 'editor', 'viewer')
  async list(
    @Param('projectSlug') projectSlug: string,
    @Param('resourceName') resourceName: string,
    @Query() query: any,
  ) {
    return this.crudService.list(projectSlug, resourceName, query);
  }

  @Get(':id')
  @ProjectRoles('admin', 'editor', 'viewer')
  async get(
    @Param('projectSlug') projectSlug: string,
    @Param('resourceName') resourceName: string,
    @Param('id') id: string,
  ) {
    return this.crudService.get(projectSlug, resourceName, id);
  }

  @Post()
  @ProjectRoles('admin', 'editor')
  async create(
    @Req() req: Request,
    @Param('projectSlug') projectSlug: string,
    @Param('resourceName') resourceName: string,
    @Body() data: any,
  ) {
    const userId = (req.user as any)?.id || '';
    return this.crudService.create(projectSlug, resourceName, data, userId);
  }

  @Put(':id')
  @ProjectRoles('admin', 'editor')
  async update(
    @Req() req: Request,
    @Param('projectSlug') projectSlug: string,
    @Param('resourceName') resourceName: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    const userId = (req.user as any)?.id || '';
    return this.crudService.update(projectSlug, resourceName, id, data, userId);
  }

  @Patch(':id')
  @ProjectRoles('admin', 'editor')
  async partialUpdate(
    @Req() req: Request,
    @Param('projectSlug') projectSlug: string,
    @Param('resourceName') resourceName: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    const userId = (req.user as any)?.id || '';
    return this.crudService.update(projectSlug, resourceName, id, data, userId);
  }

  @Delete(':id')
  @ProjectRoles('admin', 'editor')
  async delete(
    @Req() req: Request,
    @Param('projectSlug') projectSlug: string,
    @Param('resourceName') resourceName: string,
    @Param('id') id: string,
  ) {
    const userId = (req.user as any)?.id || '';
    return this.crudService.delete(projectSlug, resourceName, id, userId);
  }

  @Post('batch')
  @ProjectRoles('admin')
  async batch(
    @Req() req: Request,
    @Param('projectSlug') projectSlug: string,
    @Param('resourceName') resourceName: string,
    @Body() body: { action: string; ids: string[]; data?: any; mode?: 'soft' | 'hard' },
  ) {
    const userId = (req.user as any)?.id || '';
    if (body.action === 'update') {
      return this.crudService.batchUpdate(projectSlug, resourceName, body.ids, body.data || {}, userId);
    } else if (body.action === 'delete') {
      return this.crudService.batchDelete(projectSlug, resourceName, body.ids, body.mode || 'soft', userId);
    }
    throw new Error('Invalid action');
  }

  @Get(':id/versions')
  @ProjectRoles('admin', 'editor', 'viewer')
  async getVersions(
    @Param('projectSlug') projectSlug: string,
    @Param('resourceName') resourceName: string,
    @Param('id') id: string,
  ) {
    return this.crudService.getVersions(projectSlug, resourceName, id);
  }

  @Get(':id/versions/:version')
  @ProjectRoles('admin', 'editor', 'viewer')
  async getVersion(
    @Param('projectSlug') projectSlug: string,
    @Param('resourceName') resourceName: string,
    @Param('id') id: string,
    @Param('version') version: number,
  ) {
    return this.crudService.getVersion(projectSlug, resourceName, id, version);
  }

  @Post(':id/versions/:version/restore')
  @ProjectRoles('admin', 'editor')
  async restoreVersion(
    @Req() req: Request,
    @Param('projectSlug') projectSlug: string,
    @Param('resourceName') resourceName: string,
    @Param('id') id: string,
    @Param('version') version: number,
  ) {
    const userId = (req.user as any)?.id || '';
    return this.crudService.restoreVersion(projectSlug, resourceName, id, version, userId);
  }
}