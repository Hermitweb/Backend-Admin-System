import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomEndpoint } from '../entity/custom-endpoint.entity';
import { ProjectService } from '../project/project.service';

@Injectable()
export class EndpointService {
  constructor(
    @InjectRepository(CustomEndpoint)
    private endpointRepository: Repository<CustomEndpoint>,
    private projectService: ProjectService,
  ) {}

  async create(projectSlug: string, data: any): Promise<CustomEndpoint> {
    const project = await this.projectService.findBySlug(projectSlug);
    const endpoint = this.endpointRepository.create({
      project_id: project.id,
      ...data,
    });
    const result = await this.endpointRepository.save(endpoint);
    return Array.isArray(result) ? result[0] : result;
  }

  async findByProject(projectSlug: string): Promise<CustomEndpoint[]> {
    const project = await this.projectService.findBySlug(projectSlug);
    return this.endpointRepository.find({ where: { project_id: project.id } });
  }

  async findOne(projectSlug: string, id: string): Promise<CustomEndpoint> {
    const project = await this.projectService.findBySlug(projectSlug);
    const endpoint = await this.endpointRepository.findOne({
      where: { project_id: project.id, id },
    });
    if (!endpoint) {
      throw new NotFoundException('Endpoint not found');
    }
    return endpoint;
  }

  async update(projectSlug: string, id: string, data: any): Promise<CustomEndpoint> {
    const endpoint = await this.findOne(projectSlug, id);
    Object.assign(endpoint, data);
    return this.endpointRepository.save(endpoint);
  }

  async delete(projectSlug: string, id: string): Promise<void> {
    const endpoint = await this.findOne(projectSlug, id);
    await this.endpointRepository.delete(endpoint.id);
  }

  async execute(projectSlug: string, endpointId: string, params: any, body: any): Promise<any> {
    const endpoint = await this.findOne(projectSlug, endpointId);
    
    if (!endpoint.enabled) {
      throw new Error('Endpoint is disabled');
    }

    const definition = endpoint.definition;
    let result = {};

    if (definition.hooks && definition.hooks.length > 0) {
      for (const hook of definition.hooks) {
        if (hook.type === 'execute') {
          result = await this.executeHook(hook, params, body);
        }
      }
    }

    return result;
  }

  private async executeHook(hook: any, params: any, body: any): Promise<any> {
    if (hook.action === 'query') {
      return { message: 'Query executed', params, body };
    } else if (hook.action === 'update') {
      return { message: 'Update executed', params, body };
    } else if (hook.action === 'custom') {
      return { message: 'Custom action executed', action: hook.action, params, body };
    }
    return { message: 'Hook executed', hook };
  }
}