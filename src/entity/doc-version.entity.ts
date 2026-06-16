import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { Project } from './project.entity';

@Entity('doc_versions')
export class DocVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  project_id: string;

  @Column({ length: 32 })
  version: string;

  @Column({ type: 'simple-json' })
  snapshot: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  changelog: string;

  @Column({ type: 'simple-array', default: '' })
  deprecated: string[];

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  project: Project;
}