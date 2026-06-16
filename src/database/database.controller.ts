import { Controller, Get, Post, Put, Delete, Body, Param, ValidationPipe } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { CreateDatabaseConnectionDto } from './dto/create-database-connection.dto';
import { UpdateDatabaseConnectionDto } from './dto/update-database-connection.dto';

@Controller('api/v1/:projectSlug/databases')
export class DatabaseController {
  constructor(private databaseService: DatabaseService) {}

  @Post()
  async create(
    @Param('projectSlug') projectSlug: string,
    @Body(ValidationPipe) dto: CreateDatabaseConnectionDto,
  ) {
    return this.databaseService.create(projectSlug, dto);
  }

  @Get()
  async findByProject(@Param('projectSlug') projectSlug: string) {
    return this.databaseService.findByProject(projectSlug);
  }

  @Get(':id')
  async findOne(
    @Param('projectSlug') projectSlug: string,
    @Param('id') id: string,
  ) {
    return this.databaseService.findOne(projectSlug, id);
  }

  @Put(':id')
  async update(
    @Param('projectSlug') projectSlug: string,
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateDatabaseConnectionDto,
  ) {
    return this.databaseService.update(projectSlug, id, dto);
  }

  @Delete(':id')
  async delete(
    @Param('projectSlug') projectSlug: string,
    @Param('id') id: string,
  ) {
    await this.databaseService.delete(projectSlug, id);
    return { message: 'Database connection deleted successfully' };
  }

  @Post(':id/test')
  async testConnection(
    @Param('projectSlug') projectSlug: string,
    @Param('id') id: string,
  ) {
    return this.databaseService.testConnection(projectSlug, id);
  }

  @Post('test')
  async testNewConnection(@Body(ValidationPipe) dto: CreateDatabaseConnectionDto) {
    return this.databaseService.testNewConnection(dto);
  }

  @Post('refresh')
  async refreshStatus(@Param('projectSlug') projectSlug: string) {
    return this.databaseService.refreshStatus(projectSlug);
  }
}