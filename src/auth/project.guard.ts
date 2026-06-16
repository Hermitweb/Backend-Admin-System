import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ProjectMember } from '../entity/project-member.entity';
import { MemberRole } from '../entity/project-member.entity';
import { Project } from '../entity/project.entity';

export const PROJECT_ROLES_KEY = 'project_roles';
export const ProjectRoles = (...roles: MemberRole[]) => SetMetadata(PROJECT_ROLES_KEY, roles);

@Injectable()
export class ProjectGuard implements CanActivate {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      return false;
    }

    if (user.role === 'super_admin') {
      return true;
    }

    const requiredRoles = Reflect.getMetadata(
      PROJECT_ROLES_KEY,
      context.getHandler(),
    ) || Reflect.getMetadata(
      PROJECT_ROLES_KEY,
      context.getClass(),
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const projectSlug = request.params.projectSlug;
    
    if (!projectSlug) {
      throw new ForbiddenException('Project identifier not found');
    }

    const project = await this.dataSource.manager.findOne(Project, {
      where: { slug: projectSlug },
    });

    if (!project) {
      throw new ForbiddenException('Project not found');
    }

    const projectMember = await this.dataSource.manager.findOne(ProjectMember, {
      where: { user_id: user.userId, project_id: project.id },
    });

    if (!projectMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    if (projectMember.role === 'admin') {
      return true;
    }

    return requiredRoles.includes(projectMember.role as MemberRole);
  }
}