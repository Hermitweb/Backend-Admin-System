import { Controller, Get, Post, Put, Delete, Body, Param, ValidationPipe } from '@nestjs/common';
import { LinkService } from './link.service';
import { CreateLinkRuleDto, UpdateLinkRuleDto } from './dto';

@Controller('api/v1/_system/links')
export class LinkController {
  constructor(private linkService: LinkService) {}

  @Post()
  async create(@Body(ValidationPipe) dto: CreateLinkRuleDto) {
    return this.linkService.create(dto);
  }

  @Get()
  async findAll() {
    return this.linkService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.linkService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body(ValidationPipe) dto: UpdateLinkRuleDto) {
    return this.linkService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.linkService.delete(id);
  }
}