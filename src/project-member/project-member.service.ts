import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectMember, MemberRole } from '../entity/project-member.entity';
import { Project } from '../entity/project.entity';
import { User } from '../entity/user.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProjectMemberService {
  constructor(
    @InjectRepository(ProjectMember)
    private projectMemberRepository: Repository<ProjectMember>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findByProject(projectId: string) {
    const members = await this.projectMemberRepository.find({
      where: { project_id: projectId },
      relations: ['user', 'project'],
    });

    return {
      code: 0,
      message: 'success',
      data: members.map(member => ({
        id: `${member.project_id}-${member.user_id}`,
        project_id: member.project_id,
        user_id: member.user_id,
        role: member.role,
        created_at: member.created_at,
        user: member.user,
      })),
    };
  }

  async findByUser(userId: string) {
    const members = await this.projectMemberRepository.find({
      where: { user_id: userId },
      relations: ['project'],
    });

    return {
      code: 0,
      message: 'success',
      data: members.map(member => ({
        id: `${member.project_id}-${member.user_id}`,
        project_id: member.project_id,
        user_id: member.user_id,
        role: member.role,
        created_at: member.created_at,
        project: member.project,
      })),
    };
  }

  async addMember(projectId: string, userId: string, role: MemberRole = 'viewer') {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const existingMember = await this.projectMemberRepository.findOne({
      where: { project_id: projectId, user_id: userId },
    });

    if (existingMember) {
      throw new ForbiddenException('该用户已是项目成员');
    }

    const member = this.projectMemberRepository.create({
      project_id: projectId,
      user_id: userId,
      role,
    });

    const savedMember = await this.projectMemberRepository.save(member);

    return {
      code: 0,
      message: 'success',
      data: {
        id: `${savedMember.project_id}-${savedMember.user_id}`,
        project_id: savedMember.project_id,
        user_id: savedMember.user_id,
        role: savedMember.role,
        created_at: savedMember.created_at,
      },
    };
  }

  async updateRole(projectId: string, userId: string, role: MemberRole) {
    const member = await this.projectMemberRepository.findOne({
      where: { project_id: projectId, user_id: userId },
    });

    if (!member) {
      throw new NotFoundException('成员关系不存在');
    }

    member.role = role;
    const savedMember = await this.projectMemberRepository.save(member);

    return {
      code: 0,
      message: 'success',
      data: {
        id: `${savedMember.project_id}-${savedMember.user_id}`,
        project_id: savedMember.project_id,
        user_id: savedMember.user_id,
        role: savedMember.role,
        created_at: savedMember.created_at,
      },
    };
  }

  async removeMember(projectId: string, userId: string) {
    const member = await this.projectMemberRepository.findOne({
      where: { project_id: projectId, user_id: userId },
    });

    if (!member) {
      throw new NotFoundException('成员关系不存在');
    }

    await this.projectMemberRepository.remove(member);

    return {
      code: 0,
      message: 'success',
      data: null,
    };
  }

  async batchAddMembers(projectId: string, members: { user_id: string; role: MemberRole }[]) {
    const results = [];
    const errors = [];

    for (const { user_id, role } of members) {
      try {
        const result = await this.addMember(projectId, user_id, role);
        results.push(result.data);
      } catch (error) {
        errors.push({ user_id, message: error.message });
      }
    }

    return {
      code: 0,
      message: 'success',
      data: {
        added: results,
        errors,
      },
    };
  }
}
