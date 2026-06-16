import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export type UserStatus = 'active' | 'inactive';
export type UserRole = 'super_admin' | 'admin' | 'user';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ length: 255 })
  password: string;

  @Column({ length: 128, nullable: true })
  name: string;

  @Column({ length: 512, nullable: true })
  avatar: string;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: UserStatus;

  @Column({ type: 'varchar', length: 32, default: 'user' })
  role: UserRole;

  @CreateDateColumn()
  created_at: Date;
}