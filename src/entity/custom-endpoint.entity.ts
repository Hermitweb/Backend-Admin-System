import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Project } from './project.entity';

@Entity('custom_endpoints')
export class CustomEndpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  project_id: string;

  @Column({ length: 128, nullable: true })
  resource: string;

  @Column({ length: 128 })
  name: string;

  @Column({ length: 8 })
  method: string;

  @Column({ length: 512 })
  path: string;

  @Column({ type: 'simple-json' })
  definition: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  project: Project;
}