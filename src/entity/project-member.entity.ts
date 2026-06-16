import { Entity, Column, ManyToOne, PrimaryColumn, CreateDateColumn } from 'typeorm';
import { Project } from './project.entity';
import { User } from './user.entity';

export type MemberRole = 'admin' | 'editor' | 'viewer';

@Entity('project_members')
export class ProjectMember {
  @PrimaryColumn({ type: 'uuid' })
  project_id: string;

  @PrimaryColumn({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 32, default: 'viewer' })
  role: MemberRole;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  project: Project;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;
}