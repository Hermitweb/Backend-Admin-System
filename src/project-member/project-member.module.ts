import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectMemberService } from './project-member.service';
import { ProjectMemberController } from './project-member.controller';
import { ProjectMember } from '../entity/project-member.entity';
import { Project } from '../entity/project.entity';
import { User } from '../entity/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectMember, Project, User])],
  providers: [ProjectMemberService],
  controllers: [ProjectMemberController],
  exports: [ProjectMemberService],
})
export class ProjectMemberModule {}
