import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { EndpointService } from './endpoint.service';

@Controller('api/v1/:projectSlug/endpoints')
export class EndpointController {
  constructor(private endpointService: EndpointService) {}

  @Post()
  async create(
    @Param('projectSlug') projectSlug: string,
    @Body() data: any,
  ) {
    return this.endpointService.create(projectSlug, data);
  }

  @Get()
  async list(@Param('projectSlug') projectSlug: string) {
    return this.endpointService.findByProject(projectSlug);
  }

  @Get(':id')
  async get(
    @Param('projectSlug') projectSlug: string,
    @Param('id') id: string,
  ) {
    return this.endpointService.findOne(projectSlug, id);
  }

  @Put(':id')
  async update(
    @Param('projectSlug') projectSlug: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.endpointService.update(projectSlug, id, data);
  }

  @Delete(':id')
  async delete(
    @Param('projectSlug') projectSlug: string,
    @Param('id') id: string,
  ) {
    return this.endpointService.delete(projectSlug, id);
  }

  @Post(':id/execute')
  async execute(
    @Param('projectSlug') projectSlug: string,
    @Param('id') id: string,
    @Query() params: any,
    @Body() body: any,
  ) {
    return this.endpointService.execute(projectSlug, id, params, body);
  }
}