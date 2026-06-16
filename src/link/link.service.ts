import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LinkRule } from '../entity/link-rule.entity';
import { ProjectService } from '../project/project.service';
import { CreateLinkRuleDto, UpdateLinkRuleDto } from './dto';

@Injectable()
export class LinkService {
  constructor(
    @InjectRepository(LinkRule)
    private linkRuleRepository: Repository<LinkRule>,
    private projectService: ProjectService,
  ) {}

  async create(dto: CreateLinkRuleDto): Promise<LinkRule> {
    await this.projectService.findOne(dto.source_project);
    await this.projectService.findOne(dto.target_project);

    const rule = this.linkRuleRepository.create(dto);
    return this.linkRuleRepository.save(rule);
  }

  async findAll(): Promise<LinkRule[]> {
    return this.linkRuleRepository.find();
  }

  async findBySourceProject(projectId: string): Promise<LinkRule[]> {
    return this.linkRuleRepository.find({ where: { source_project: projectId } });
  }

  async findOne(id: string): Promise<LinkRule> {
    const rule = await this.linkRuleRepository.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException('Link rule not found');
    }
    return rule;
  }

  async update(id: string, dto: UpdateLinkRuleDto): Promise<LinkRule> {
    const rule = await this.findOne(id);
    Object.assign(rule, dto);
    return this.linkRuleRepository.save(rule);
  }

  async delete(id: string): Promise<void> {
    const result = await this.linkRuleRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Link rule not found');
    }
  }
}