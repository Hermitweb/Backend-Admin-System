import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Project } from './project.entity';

@Entity('resource_schemas')
export class ResourceSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  project_id: string;

  @Column({ length: 128 })
  name: string;

  @Column({ length: 128, nullable: true })
  display_name: string;

  @Column({ type: 'simple-json' })
  definition: Record<string, any>;

  @Column({ type: 'int', default: 1 })
  version: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  project: Project;
}