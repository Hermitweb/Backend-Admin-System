import { useState } from 'react'
import { Shield, Users, FolderKanban, Lock, Unlock, ChevronRight, Info } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'

const systemRoles = [
  {
    id: 'super_admin',
    name: '超级管理员',
    description: '拥有系统所有权限，可以管理用户、项目和配置',
    permissions: ['管理用户', '管理项目', '管理系统配置', '查看所有数据', '修改所有数据', '删除所有数据'],
    color: 'bg-danger',
  },
  {
    id: 'admin',
    name: '管理员',
    description: '可以管理项目和用户，但不能修改系统配置',
    permissions: ['管理用户', '管理项目', '查看所有数据', '修改所有数据', '删除所有数据'],
    color: 'bg-warning',
  },
  {
    id: 'user',
    name: '普通用户',
    description: '只能访问分配的项目，根据项目角色获得相应权限',
    permissions: ['查看分配的项目', '根据项目角色操作数据'],
    color: 'bg-primary',
  },
]

const projectRoles = [
  {
    id: 'admin',
    name: '项目管理员',
    description: '拥有项目的所有权限，可以管理项目成员和配置',
    permissions: ['管理项目成员', '管理项目配置', '管理Schema', '查看数据', '修改数据', '删除数据'],
    color: 'bg-danger',
  },
  {
    id: 'editor',
    name: '编辑者',
    description: '可以创建、修改和删除数据，但不能管理项目配置',
    permissions: ['查看数据', '创建数据', '修改数据', '删除数据'],
    color: 'bg-primary',
  },
  {
    id: 'viewer',
    name: '查看者',
    description: '只能查看数据，不能进行修改操作',
    permissions: ['查看数据'],
    color: 'bg-secondary',
  },
]

export function Permissions() {
  const [activeTab, setActiveTab] = useState<'system' | 'project'>('system')
  const [selectedRole, setSelectedRole] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const handleRoleClick = (role: any) => {
    setSelectedRole(role)
    setModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">权限设置</h1>
          <p className="text-text-secondary mt-1">管理系统角色和项目角色的权限配置</p>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-bg-hover p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
            activeTab === 'system'
              ? 'bg-primary text-white'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Users className="w-4 h-4" />
          系统角色
        </button>
        <button
          onClick={() => setActiveTab('project')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
            activeTab === 'project'
              ? 'bg-primary text-white'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          项目角色
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(activeTab === 'system' ? systemRoles : projectRoles).map((role) => (
          <Card
            key={role.id}
            className="cursor-pointer hover:shadow-lg transition-all"
            onClick={() => handleRoleClick(role)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${role.color} rounded-lg flex items-center justify-center`}>
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">{role.name}</h3>
                  <span className="text-xs text-text-muted">{role.id}</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted" />
            </div>
            <p className="text-sm text-text-secondary mb-4">{role.description}</p>
            <div className="flex flex-wrap gap-2">
              {role.permissions.slice(0, 3).map((perm, index) => (
                <span
                  key={index}
                  className="px-2.5 py-1 bg-bg-hover text-xs text-text-secondary rounded-full"
                >
                  {perm}
                </span>
              ))}
              {role.permissions.length > 3 && (
                <span className="px-2.5 py-1 bg-bg-hover text-xs text-text-muted rounded-full">
                  +{role.permissions.length - 3}
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          权限说明
        </h3>
        <div className="space-y-4 text-sm text-text-secondary">
          <div>
            <h4 className="font-medium text-text-primary mb-1">系统角色</h4>
            <p>系统角色决定用户在整个系统中的权限范围。超级管理员拥有最高权限，管理员可以管理项目和用户，普通用户只能访问分配的项目。</p>
          </div>
          <div>
            <h4 className="font-medium text-text-primary mb-1">项目角色</h4>
            <p>项目角色决定用户在特定项目中的权限。项目管理员可以管理项目成员，编辑者可以修改数据，查看者只能查看数据。</p>
          </div>
          <div>
            <h4 className="font-medium text-text-primary mb-1">权限继承</h4>
            <p>超级管理员自动拥有所有项目的管理员权限。用户需要先被分配到项目，然后才能获得项目角色权限。</p>
          </div>
        </div>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setSelectedRole(null)
        }}
        title={`${selectedRole?.name} - 权限详情`}
        size="lg"
      >
        {selectedRole && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 ${selectedRole.color} rounded-xl flex items-center justify-center`}>
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-primary">{selectedRole.name}</h3>
                <p className="text-text-secondary">{selectedRole.description}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-text-primary mb-3 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                权限列表
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedRole.permissions.map((perm: string, index: number) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-bg-hover rounded-lg">
                    <Unlock className="w-4 h-4 text-success flex-shrink-0" />
                    <span className="text-sm text-text-primary">{perm}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>关闭</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}