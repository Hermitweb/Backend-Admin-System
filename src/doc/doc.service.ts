import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocVersion } from '../entity/doc-version.entity';
import { ResourceSchema } from '../entity/resource-schema.entity';
import { CustomEndpoint } from '../entity/custom-endpoint.entity';
import { ProjectService } from '../project/project.service';
import * as yaml from 'yaml';

@Injectable()
export class DocService {
  constructor(
    @InjectRepository(DocVersion)
    private docVersionRepository: Repository<DocVersion>,
    @InjectRepository(ResourceSchema)
    private schemaRepository: Repository<ResourceSchema>,
    @InjectRepository(CustomEndpoint)
    private endpointRepository: Repository<CustomEndpoint>,
    private projectService: ProjectService,
  ) {}

  async generateOpenApi(projectSlug: string): Promise<Record<string, any>> {
    const project = await this.projectService.findBySlug(projectSlug);
    
    const schemas = await this.schemaRepository.find({
      where: { project_id: project.id },
    });
    
    const endpoints = await this.endpointRepository.find({
      where: { project_id: project.id, enabled: true },
    });

    const openApi: Record<string, any> = {
      openapi: '3.1.0',
      info: {
        title: project.name,
        description: project.description || `${project.name} API Documentation`,
        version: '1.0.0',
        contact: {
          name: 'API Support',
          email: 'support@example.com',
        },
      },
      servers: [
        {
          url: `/api/v1/${projectSlug}`,
          description: `${project.name} API`,
        },
        {
          url: `http://localhost:3000/api/v1/${projectSlug}`,
          description: 'Local Development Server',
        },
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
        responses: {
          Unauthorized: {
            description: 'Unauthorized - Invalid or missing token',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'integer', example: 401 },
                    message: { type: 'string', example: 'Unauthorized' },
                    data: { type: 'null' },
                  },
                },
              },
            },
          },
          Forbidden: {
            description: 'Forbidden - Insufficient permissions',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'integer', example: 403 },
                    message: { type: 'string', example: 'Forbidden' },
                    data: { type: 'null' },
                  },
                },
              },
            },
          },
          NotFound: {
            description: 'Not Found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'integer', example: 404 },
                    message: { type: 'string', example: 'Not Found' },
                    data: { type: 'null' },
                  },
                },
              },
            },
          },
          BadRequest: {
            description: 'Bad Request - Invalid input',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'integer', example: 400 },
                    message: { type: 'string', example: 'Bad Request' },
                    data: { type: 'null' },
                  },
                },
              },
            },
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    };

    schemas.forEach((schema) => {
      const resourceName = schema.name;
      const definition = schema.definition;
      const displayName = definition.display_name || resourceName;
      
      const schemaProperties: Record<string, any> = {};
      definition.fields?.forEach((field: any) => {
        schemaProperties[field.name] = this.mapFieldToOpenApi(field);
      });
      
      schemaProperties.id = {
        type: 'string',
        format: 'uuid',
        description: 'Unique identifier',
      };
      schemaProperties.created_at = {
        type: 'string',
        format: 'date-time',
        description: 'Created timestamp',
      };
      schemaProperties.updated_at = {
        type: 'string',
        format: 'date-time',
        description: 'Updated timestamp',
      };

      const resourceSchema = {
        type: 'object',
        properties: schemaProperties,
        required: ['id', ...(definition.fields?.filter((f: any) => f.required).map((f: any) => f.name) || [])],
        description: `${displayName} resource schema`,
        example: this.generateExample(definition.fields || []),
      };

      const listResponseSchema = {
        type: 'object',
        properties: {
          code: { type: 'integer', example: 0 },
          message: { type: 'string', example: 'success' },
          data: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: { $ref: `#/components/schemas/${resourceName}` },
              },
              total: { type: 'integer', example: 100 },
              page: { type: 'integer', example: 1 },
              page_size: { type: 'integer', example: 20 },
              total_pages: { type: 'integer', example: 5 },
            },
          },
        },
      };

      const singleResponseSchema = {
        type: 'object',
        properties: {
          code: { type: 'integer', example: 0 },
          message: { type: 'string', example: 'success' },
          data: { $ref: `#/components/schemas/${resourceName}` },
        },
      };

      openApi.components.schemas[resourceName] = resourceSchema;

      openApi.paths[`/${resourceName}`] = {
        get: {
          summary: `List ${displayName}`,
          description: `Retrieve a paginated list of ${displayName} resources`,
          operationId: `list${this.capitalize(resourceName)}`,
          tags: [displayName],
          parameters: [
            {
              name: 'page',
              in: 'query',
              required: false,
              schema: { type: 'integer', default: 1, minimum: 1 },
              description: 'Page number',
            },
            {
              name: 'page_size',
              in: 'query',
              required: false,
              schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
              description: 'Number of items per page',
            },
            {
              name: 'filter',
              in: 'query',
              required: false,
              schema: { type: 'string' },
              description: 'Filter criteria in JSON format',
              example: '{"status":"active"}',
            },
            {
              name: 'sort',
              in: 'query',
              required: false,
              schema: { type: 'string' },
              description: 'Sort field and direction',
              example: 'created_at DESC',
            },
            {
              name: 'fields',
              in: 'query',
              required: false,
              schema: { type: 'string' },
              description: 'Comma-separated list of fields to include',
              example: 'id,name,created_at',
            },
          ],
          responses: {
            '200': {
              description: 'Successful operation',
              content: {
                'application/json': {
                  schema: listResponseSchema,
                },
              },
            },
            '401': {
              $ref: '#/components/responses/Unauthorized',
            },
          },
        },
        post: {
          summary: `Create ${displayName}`,
          description: `Create a new ${displayName} resource`,
          operationId: `create${this.capitalize(resourceName)}`,
          tags: [displayName],
          requestBody: {
            description: `${displayName} object that needs to be created`,
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: schemaProperties,
                  required: definition.fields?.filter((f: any) => f.required).map((f: any) => f.name) || [],
                  example: this.generateExample(definition.fields || []),
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Successful operation',
              content: {
                'application/json': {
                  schema: singleResponseSchema,
                },
              },
            },
            '400': {
              $ref: '#/components/responses/BadRequest',
            },
            '401': {
              $ref: '#/components/responses/Unauthorized',
            },
          },
        },
      };

      openApi.paths[`/${resourceName}/{id}`] = {
        get: {
          summary: `Get ${displayName} by ID`,
          description: `Retrieve a specific ${displayName} by its ID`,
          operationId: `get${this.capitalize(resourceName)}`,
          tags: [displayName],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: `ID of the ${displayName} to retrieve`,
            },
          ],
          responses: {
            '200': {
              description: 'Successful operation',
              content: {
                'application/json': {
                  schema: singleResponseSchema,
                },
              },
            },
            '401': {
              $ref: '#/components/responses/Unauthorized',
            },
            '404': {
              $ref: '#/components/responses/NotFound',
            },
          },
        },
        put: {
          summary: `Update ${displayName}`,
          description: `Update an existing ${displayName} resource`,
          operationId: `update${this.capitalize(resourceName)}`,
          tags: [displayName],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: `ID of the ${displayName} to update`,
            },
          ],
          requestBody: {
            description: `${displayName} object with updated values`,
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: schemaProperties,
                  example: this.generateExample(definition.fields || []),
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Successful operation',
              content: {
                'application/json': {
                  schema: singleResponseSchema,
                },
              },
            },
            '400': {
              $ref: '#/components/responses/BadRequest',
            },
            '401': {
              $ref: '#/components/responses/Unauthorized',
            },
            '404': {
              $ref: '#/components/responses/NotFound',
            },
          },
        },
        delete: {
          summary: `Delete ${displayName}`,
          description: `Delete a ${displayName} resource`,
          operationId: `delete${this.capitalize(resourceName)}`,
          tags: [displayName],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: `ID of the ${displayName} to delete`,
            },
          ],
          responses: {
            '200': {
              description: 'Successful operation',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      code: { type: 'integer', example: 0 },
                      message: { type: 'string', example: 'success' },
                      data: { type: 'null' },
                    },
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/Unauthorized',
            },
            '404': {
              $ref: '#/components/responses/NotFound',
            },
          },
        },
      };
    });

    endpoints.forEach((endpoint) => {
      const def = endpoint.definition;
      openApi.paths[endpoint.path] = openApi.paths[endpoint.path] || {};
      
      const params = (def.parameters || []).map((p: any) => ({
        name: p.name,
        in: p.in,
        required: p.required,
        schema: { 
          type: this.mapType(p.type),
          format: p.type === 'uuid' ? 'uuid' : undefined,
        },
        description: p.description,
        example: p.example,
      }));

      if (endpoint.path.includes('{')) {
        const pathParams = endpoint.path.match(/\{(\w+)\}/g) || [];
        pathParams.forEach((param: string) => {
          const paramName = param.slice(1, -1);
          if (!params.find((p: any) => p.name === paramName)) {
            params.push({
              name: paramName,
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: `${paramName} identifier`,
            });
          }
        });
      }

      openApi.paths[endpoint.path][endpoint.method.toLowerCase()] = {
        summary: def.description || endpoint.name,
        description: def.description || `Execute ${endpoint.name} endpoint`,
        operationId: endpoint.name,
        tags: ['Custom Endpoints'],
        parameters: params.length > 0 ? params : undefined,
        requestBody: def.requestBody ? {
          description: def.requestBody.description || 'Request body',
          required: true,
          content: {
            'application/json': {
              schema: def.requestBody.schema || { type: 'object' },
            },
          },
        } : undefined,
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'integer', example: 0 },
                    message: { type: 'string', example: 'success' },
                    data: def.responseSchema || { type: 'object' },
                  },
                },
              },
            },
          },
          '401': {
            $ref: '#/components/responses/Unauthorized',
          },
          '404': {
            $ref: '#/components/responses/NotFound',
          },
        },
      };
    });

    return openApi;
  }

  async getOpenApiJson(projectSlug: string): Promise<string> {
    const openApi = await this.generateOpenApi(projectSlug);
    return JSON.stringify(openApi, null, 2);
  }

  async getOpenApiYaml(projectSlug: string): Promise<string> {
    const openApi = await this.generateOpenApi(projectSlug);
    return yaml.stringify(openApi);
  }

  async saveVersion(projectSlug: string, version: string): Promise<DocVersion> {
    const project = await this.projectService.findBySlug(projectSlug);
    const openApi = await this.generateOpenApi(projectSlug);

    const docVersion = this.docVersionRepository.create({
      project_id: project.id,
      version,
      snapshot: openApi,
      changelog: `Auto-generated version ${version}`,
    });

    return this.docVersionRepository.save(docVersion);
  }

  private mapFieldToOpenApi(field: any): Record<string, any> {
    const typeMap: Record<string, string> = {
      string: 'string',
      text: 'string',
      rich_text: 'string',
      integer: 'integer',
      decimal: 'number',
      boolean: 'boolean',
      ulid: 'string',
      uuid: 'string',
      timestamp: 'string',
      date: 'string',
      json: 'object',
      file: 'string',
      array: 'array',
      enum: 'string',
      relation: 'string',
    };

    const formatMap: Record<string, string> = {
      timestamp: 'date-time',
      date: 'date',
      uuid: 'uuid',
      ulid: 'string',
      decimal: 'double',
    };

    const result: Record<string, any> = {
      type: typeMap[field.type] || 'string',
      format: formatMap[field.type],
      description: field.description || field.label,
    };

    if (field.type === 'array') {
      result.items = { type: 'string' };
    }

    if (field.type === 'enum' && field.options) {
      result.enum = field.options;
    }

    if (field.min !== undefined) {
      result.minimum = field.min;
    }

    if (field.max !== undefined) {
      result.maximum = field.max;
    }

    if (field.default !== undefined) {
      result.default = field.default;
    }

    return result;
  }

  private mapType(type: string): string {
    const typeMap: Record<string, string> = {
      string: 'string',
      integer: 'integer',
      number: 'number',
      boolean: 'boolean',
      ulid: 'string',
      uuid: 'string',
      timestamp: 'string',
      date: 'string',
      json: 'object',
      array: 'array',
    };
    return typeMap[type] || 'string';
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private generateExample(fields: any[]): Record<string, any> {
    const example: Record<string, any> = {};
    fields.forEach((field) => {
      switch (field.type) {
        case 'string':
          example[field.name] = `Example ${field.label || field.name}`;
          break;
        case 'text':
          example[field.name] = `This is an example ${field.label || field.name} content.`;
          break;
        case 'integer':
          example[field.name] = 1;
          break;
        case 'decimal':
          example[field.name] = 1.5;
          break;
        case 'boolean':
          example[field.name] = true;
          break;
        case 'timestamp':
          example[field.name] = new Date().toISOString();
          break;
        case 'date':
          example[field.name] = new Date().toISOString().split('T')[0];
          break;
        case 'enum':
          example[field.name] = field.options?.[0] || 'option1';
          break;
        case 'json':
          example[field.name] = {};
          break;
        case 'array':
          example[field.name] = [];
          break;
        default:
          example[field.name] = '';
      }
    });
    return example;
  }
}