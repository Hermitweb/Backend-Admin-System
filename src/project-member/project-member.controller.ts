import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjectMemberService } from './project-member.service';
import { MemberRole } from '../entity/project-member.entity';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('api/v1/_system/project-members')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'super_admin')
export class ProjectMemberController {
  constructor(private projectMemberService: ProjectMemberService) {}

  @Get('project/:projectId')
  async getProjectMembers(@Param('projectId') projectId: string) {
    return this.projectMemberService.findByProject(projectId);
  }

  @Get('user/:userId')
  async getUserMemberships(@Param('userId') userId: string) {
    return this.projectMemberService.findByUser(userId);
  }

  @Post()
  @Roles('admin', 'super_admin')
  async addMember(
    @Body() body: { project_id: string; user_id: string; role?: MemberRole },
  ) {
    return this.projectMemberService.addMember(body.project_id, body.user_id, body.role || 'viewer');
  }

  @Put(':projectId/:userId')
  @Roles('admin', 'super_admin')
  async updateRole(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @Body() body: { role: MemberRole },
  ) {
    return this.projectMemberService.updateRole(projectId, userId, body.role);
  }

  @Delete(':projectId/:userId')
  @Roles('admin', 'super_admin')
  async removeMember(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
  ) {
    return this.projectMemberService.removeMember(projectId, userId);
  }

  @Post('batch')
  @Roles('admin', 'super_admin')
  async batchAddMembers(
    @Body() body: { project_id: string; members: { user_id: string; role: MemberRole }[] },
  ) {
    return this.projectMemberService.batchAddMembers(body.project_id, body.members);
  }
}
