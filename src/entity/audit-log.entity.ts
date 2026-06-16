import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

export type AuditAction = 'create' | 'update' | 'delete' | 'custom';

@Entity('audit_logs')
@Index('idx_audit_project_time', (auditLog: AuditLog) => [auditLog.project_id, auditLog.created_at])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  project_id: string;

  @Column({ type: 'uuid', nullable: true })
  user_id: string;

  @Column({ length: 32 })
  action: AuditAction;

  @Column({ length: 128 })
  resource: string;

  @Column({ length: 26, nullable: true })
  record_id: string;

  @Column({ type: 'simple-json', nullable: true })
  changes: Record<string, any>;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string;

  @CreateDateColumn()
  created_at: Date;
}