import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type ProjectStatus = 'active' | 'suspended' | 'archived';
export type IsolationType = 'strict' | 'linked';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 64 })
  slug: string;

  @Column({ length: 128 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: ProjectStatus;

  @Column({ type: 'varchar', length: 16, default: 'strict' })
  isolation: IsolationType;

  @Column({ type: 'simple-array', default: '' })
  linked_projects: string[];

  @Column({ type: 'simple-json', default: '{}' })
  config: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}