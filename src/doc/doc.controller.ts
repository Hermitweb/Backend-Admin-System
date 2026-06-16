import { Controller, Get, Post, Param, Body, ValidationPipe } from '@nestjs/common';
import { DocService } from './doc.service';
import { SaveVersionDto } from './dto';

@Controller('api/v1/:projectSlug/docs')
export class DocController {
  constructor(private docService: DocService) {}

  @Get('openapi.json')
  async getOpenApiJson(@Param('projectSlug') projectSlug: string) {
    const json = await this.docService.getOpenApiJson(projectSlug);
    return JSON.parse(json);
  }

  @Get('openapi.yaml')
  async getOpenApiYaml(@Param('projectSlug') projectSlug: string) {
    return await this.docService.getOpenApiYaml(projectSlug);
  }

  @Post('versions')
  async saveVersion(
    @Param('projectSlug') projectSlug: string,
    @Body(ValidationPipe) dto: SaveVersionDto,
  ) {
    return this.docService.saveVersion(projectSlug, dto.version);
  }
}