import { Controller, Get, Post, Put, Delete, Body, Param, Query, ValidationPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('api/v1/_system/users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'super_admin')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.userService.findAll(parseInt(page), parseInt(limit), search);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Post()
  @Roles('super_admin')
  async create(@Body(ValidationPipe) dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body(ValidationPipe) dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: 'active' | 'inactive' }) {
    return this.userService.updateStatus(id, body.status);
  }

  @Delete(':id')
  @Roles('super_admin')
  async delete(@Param('id') id: string) {
    return this.userService.delete(id);
  }

  @Delete('batch')
  @Roles('super_admin')
  async batchDelete(@Body() body: { ids: string[] }) {
    return this.userService.batchDelete(body.ids);
  }
}