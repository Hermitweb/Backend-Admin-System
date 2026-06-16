import { Controller, Get, Post, Put, Delete, Body, Param, ValidationPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SchemaService } from './schema.service';
import { CreateSchemaDto, UpdateSchemaDto } from './dto';
import { ProjectRoles, ProjectGuard } from '../auth/project.guard';

@Controller('api/v1/_system/schemas')
@UseGuards(AuthGuard('jwt'), ProjectGuard)
export class SchemaController {
  constructor(private schemaService: SchemaService) {}

  @Get(':projectSlug')
  @ProjectRoles('admin', 'editor', 'viewer')
  async findByProject(@Param('projectSlug') projectSlug: string) {
    return this.schemaService.findByProject(projectSlug);
  }

  @Get(':projectSlug/:schemaName')
  @ProjectRoles('admin', 'editor', 'viewer')
  async findOne(
    @Param('projectSlug') projectSlug: string,
    @Param('schemaName') schemaName: string,
  ) {
    return this.schemaService.findOne(projectSlug, schemaName);
  }

  @Post(':projectSlug')
  @ProjectRoles('admin', 'editor')
  async create(
    @Param('projectSlug') projectSlug: string,
    @Body(ValidationPipe) dto: CreateSchemaDto,
  ) {
    return this.schemaService.create(projectSlug, dto);
  }

  @Put(':projectSlug/:schemaName')
  @ProjectRoles('admin', 'editor')
  async update(
    @Param('projectSlug') projectSlug: string,
    @Param('schemaName') schemaName: string,
    @Body(ValidationPipe) dto: UpdateSchemaDto,
  ) {
    return this.schemaService.update(projectSlug, schemaName, dto);
  }

  @Delete(':projectSlug/:schemaName')
  @ProjectRoles('admin')
  async delete(
    @Param('projectSlug') projectSlug: string,
    @Param('schemaName') schemaName: string,
  ) {
    return this.schemaService.delete(projectSlug, schemaName);
  }
}