import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export type LinkMode = 'read_only' | 'read_write' | 'sync';
export type ConflictStrategy = 'source_wins' | 'target_wins' | 'merge' | 'error';

@Entity('link_rules')
export class LinkRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  source_project: string;

  @Column({ type: 'uuid' })
  target_project: string;

  @Column({ length: 128 })
  resource_type: string;

  @Column({ type: 'varchar', length: 16, default: 'read_only' })
  link_mode: LinkMode;

  @Column({ type: 'simple-json', default: '{}' })
  field_mapping: Record<string, any>;

  @Column({ type: 'varchar', length: 16, default: 'source_wins' })
  conflict_strategy: ConflictStrategy;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @CreateDateColumn()
  created_at: Date;
}