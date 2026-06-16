import { Controller, Get, Post, Put, Delete, Body, Param, ValidationPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjectService } from './project.service';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('api/v1/_system/projects')
export class ProjectController {
  constructor(private projectService: ProjectService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'super_admin')
  async create(@Body(ValidationPipe) dto: CreateProjectDto) {
    return this.projectService.create(dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll() {
    return this.projectService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findOne(@Param('id') id: string) {
    return this.projectService.findOne(id);
  }

  @Get('slug/:slug')
  @UseGuards(AuthGuard('jwt'))
  async findBySlug(@Param('slug') slug: string) {
    return this.projectService.findBySlug(slug);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'super_admin')
  async update(@Param('id') id: string, @Body(ValidationPipe) dto: UpdateProjectDto) {
    return this.projectService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'super_admin')
  async delete(@Param('id') id: string) {
    return this.projectService.delete(id);
  }
}