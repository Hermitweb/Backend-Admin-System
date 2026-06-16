# Backend Admin System

<p align="center">
  <strong>通用型后端管理平台</strong>
</p>

<p align="center">
  基于 NestJS + React + TypeScript 的现代化后端管理系统，支持多项目管理、动态Schema、API自动生成、权限控制等核心功能。
</p>

---

## 📖 目录

- [项目介绍](#项目介绍)
- [技术文档](#技术文档)
- [使用手册](#使用手册)
- [部署流程](#部署流程)
- [故障处理方法](#故障处理方法)
- [项目开源声明](#项目开源声明)

---

## 🏗️ 项目介绍

### 系统概述

Backend Admin System 是一个专为现代 Web 应用设计的后端管理平台，旨在为开发者提供快速搭建、灵活配置的后端服务解决方案。通过可视化界面管理数据模型、用户权限和API接口，大幅降低后端开发复杂度。

### 核心特性

| 特性 | 说明 |
|------|------|
| **多项目管理** | 支持创建多个独立项目，实现数据隔离和独立配置 |
| **动态 Schema** | 可视化定义数据模型，自动生成数据库表结构 |
| **CRUD 自动生成** | 基于 Schema 自动生成 RESTful API，无需编写后端代码 |
| **权限系统** | 支持系统级角色和项目级角色，细粒度权限控制 |
| **API 文档** | 自动生成 OpenAPI 文档，支持 JSON/YAML 格式 |
| **数据库管理** | 支持 SQLite、PostgreSQL、MySQL 等多种数据库 |
| **审计日志** | 记录所有关键操作，支持操作追溯和安全审计 |
| **系统设置** | 可视化管理系统配置，支持动态更新 |

### 适用场景

- 企业内部管理系统
- SaaS 产品后台管理
- 数据可视化平台
- 快速原型开发
- API 服务网关

---

## 🔧 技术文档

### 技术栈

#### 后端技术栈

```
NestJS 10.x          # 渐进式 Node.js 框架
TypeScript 5.x       # 类型安全的 JavaScript 超集
TypeORM 0.3.x        # TypeScript ORM 框架
Passport.js          # 身份认证中间件
JWT                  # JSON Web Token 认证
SQLite3              # 轻量级数据库
PostgreSQL           # 关系型数据库（可选）
class-validator      # 数据验证
```

#### 前端技术栈

```
React 19.x           # 用户界面框架
TypeScript 5.x       # 类型安全
Vite 6.x             # 现代化构建工具
Tailwind CSS 4.x     # 原子化 CSS 框架
React Router 7.x     # 路由管理
Zustand 4.x          # 状态管理
Axios                # HTTP 客户端
Lucide React         # 图标库
```

### 项目结构

```
backend-admin/
├── src/                          # 后端源代码
│   ├── auth/                     # 认证模块
│   │   ├── auth.controller.ts   # 认证控制器
│   │   ├── auth.service.ts       # 认证服务
│   │   ├── jwt.strategy.ts       # JWT策略
│   │   ├── project.guard.ts      # 项目权限守卫
│   │   ├── roles.decorator.ts    # 角色装饰器
│   │   └── roles.guard.ts        # 角色守卫
│   ├── project/                  # 项目模块
│   ├── user/                     # 用户模块
│   ├── schema/                   # Schema模块
│   ├── crud/                     # CRUD模块
│   ├── database/                 # 数据库模块
│   ├── dashboard/                # 控制台模块
│   ├── settings/                 # 设置模块
│   ├── audit/                    # 审计模块
│   ├── link/                     # 联动规则模块
│   ├── doc/                      # 文档模块
│   ├── endpoint/                 # 自定义端点模块
│   ├── entity/                   # 数据库实体
│   ├── common/                   # 公共组件
│   └── app.module.ts             # 应用模块
│
├── frontend/                     # 前端源代码
│   ├── src/
│   │   ├── pages/                # 页面组件
│   │   │   ├── Dashboard.tsx     # 控制台
│   │   │   ├── Projects.tsx      # 项目管理
│   │   │   ├── Users.tsx        # 用户管理
│   │   │   ├── Schemas.tsx      # Schema管理
│   │   │   ├── DataManager.tsx  # 数据管理
│   │   │   ├── Database.tsx     # 数据库管理
│   │   │   ├── Settings.tsx     # 系统设置
│   │   │   └── ...              # 其他页面
│   │   ├── components/           # 公共组件
│   │   ├── services/             # API服务
│   │   ├── store/                # 状态管理
│   │   └── types/                # 类型定义
│   └── vite.config.ts            # Vite配置
│
├── scripts/                      # 工具脚本
│   ├── init-db.js                # 数据库初始化
│   ├── seed-data.js              # 种子数据
│   └── ...                       # 其他脚本
│
├── deploy/                       # 部署配置
│   ├── windows/                  # Windows部署
│   ├── linux/                    # Linux部署
│   ├── macos/                    # macOS部署
│   └── nginx/                    # Nginx配置
│
├── data/                         # 数据目录
│   └── db.sqlite                 # SQLite数据库
│
├── Dockerfile                    # Docker镜像
├── docker-compose.yml            # Docker Compose
├── package.json                  # 后端依赖
└── tsconfig.json                 # TypeScript配置
```

### 数据库实体

#### 核心实体

| 实体 | 说明 |
|------|------|
| `User` | 用户信息，包含账号、密码、系统角色 |
| `Project` | 项目信息，包含项目名称、Slug、描述 |
| `ResourceSchema` | 数据模型定义，包含字段类型、验证规则 |
| `DatabaseConnection` | 数据库连接配置 |
| `AuditLog` | 审计日志，记录所有操作 |
| `SystemSetting` | 系统设置，键值对配置 |
| `LinkRule` | 联动规则，跨项目数据联动 |
| `DocVersion` | API文档版本 |
| `CustomEndpoint` | 自定义端点 |
| `ProjectMember` | 项目成员关系 |

#### 实体关系

```
User ←→ ProjectMember ←→ Project
                    ↓
              ResourceSchema ←→ CRUD API
                    ↓
              DatabaseConnection
```

### API 文档

#### 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/auth/login` | 用户登录 |
| POST | `/api/v1/auth/register` | 用户注册 |

#### 系统管理接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/_system/projects` | 获取项目列表 |
| POST | `/api/v1/_system/projects` | 创建项目 |
| GET | `/api/v1/_system/users` | 获取用户列表 |
| POST | `/api/v1/_system/users` | 创建用户 |
| GET | `/api/v1/dashboard/stats` | 获取控制台统计 |
| GET | `/api/v1/dashboard/system-status` | 获取系统状态 |
| GET | `/api/v1/settings` | 获取系统设置 |
| POST | `/api/v1/settings/batch` | 批量更新设置 |

#### 项目 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/:projectSlug/api/:resourceName` | 获取资源列表 |
| POST | `/api/v1/:projectSlug/api/:resourceName` | 创建资源 |
| GET | `/api/v1/:projectSlug/api/:resourceName/:id` | 获取单个资源 |
| PUT | `/api/v1/:projectSlug/api/:resourceName/:id` | 更新资源 |
| DELETE | `/api/v1/:projectSlug/api/:resourceName/:id` | 删除资源 |
| GET | `/api/v1/:projectSlug/docs/openapi.json` | 获取 OpenAPI 文档 |

### 权限模型

#### 系统角色

| 角色 | 权限 |
|------|------|
| `super_admin` | 超级管理员，拥有所有权限 |
| `admin` | 管理员，管理用户和项目 |
| `user` | 普通用户，基础访问权限 |

#### 项目角色

| 角色 | 权限 |
|------|------|
| `admin` | 项目管理员，完整管理权限 |
| `editor` | 编辑者，创建和编辑数据 |
| `viewer` | 查看者，只读权限 |

---

## 🚀 使用手册

### 环境要求

#### 必要环境

- **Node.js**: >= 20.x
- **npm**: >= 10.x 或 **pnpm**: >= 8.x
- **操作系统**: Windows 10+ / macOS 12+ / Ubuntu 20.04+

#### 可选环境

- **PostgreSQL**: 14+（生产环境推荐）
- **Redis**: 6+（缓存支持）
- **Nginx**: 1.20+（反向代理）
- **Docker**: 24+（容器化部署）

### 快速开始

#### 1. 克隆项目

```bash
git clone <repository-url>
cd backend-admin
```

#### 2. 安装依赖

```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd frontend
npm install
cd ..
```

#### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.production .env

# 编辑配置
# Windows
notepad .env

# Linux/macOS
nano .env
```

关键配置项：

```env
# 服务器配置
PORT=3000
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=3600s

# 数据库配置
DB_TYPE=sqlite
DB_DATABASE=database.sqlite

# 日志配置
LOG_LEVEL=info
```

#### 4. 初始化数据库

```bash
# 运行初始化脚本
node scripts/init-db.js

# 可选：添加测试数据
node scripts/seed-data.js
```

#### 5. 启动开发服务器

```bash
# 启动后端（开发模式）
npm run start:dev

# 启动前端（新终端窗口）
cd frontend
npm run dev
```

#### 6. 访问系统

- 前端界面: http://localhost:5173
- 后端 API: http://localhost:3000
- 默认账号: `admin@example.com`
- 默认密码: `admin123`

### 常用命令

#### 后端命令

```bash
# 开发模式（热重载）
npm run start:dev

# 生产模式
npm run start:prod

# 构建
npm run build

# 运行测试
npm run test

# 代码检查
npm run lint
```

#### 前端命令

```bash
# 开发模式
cd frontend
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview

# 代码检查
npm run lint
```

### 功能使用指南

#### 创建项目

1. 登录系统后，点击左侧导航栏「项目管理」
2. 点击「新建项目」按钮
3. 填写项目信息：
   - 项目名称（中文）
   - 项目标识（英文，用于 URL）
   - 项目描述
4. 点击「确认」创建

#### 定义数据模型

1. 进入项目后，点击「Schema管理」
2. 点击「新建模型」
3. 定义字段：
   - 字段名称
   - 字段类型（字符串、数字、日期、布尔等）
   - 是否必填
   - 默认值
4. 保存后系统自动创建数据库表

#### 管理数据

1. 点击「数据管理」进入数据列表
2. 支持操作：
   - 查看数据：表格形式展示
   - 创建数据：点击「新建」按钮
   - 编辑数据：点击行内编辑按钮
   - 删除数据：点击行内删除按钮
   - 搜索数据：使用搜索框过滤
   - 分页浏览：底部分页控件

#### 配置数据库连接

1. 点击「数据库管理」
2. 点击「新建连接」
3. 填写连接信息：
   - 数据库类型
   - 主机地址
   - 端口
   - 数据库名
   - 用户名
   - 密码
4. 点击「测试连接」验证
5. 点击「保存」保存配置

#### 管理用户权限

1. 点击「用户管理」
2. 选择用户
3. 设置系统角色
4. 在项目中设置项目角色

---

## 📦 部署流程

### Docker 部署（推荐）

#### 1. 准备环境

```bash
# 安装 Docker
# Windows: 下载 Docker Desktop
# Linux: sudo apt install docker.io docker-compose
# macOS: brew install docker docker-compose
```

#### 2. 配置环境变量

```bash
cp .env.production .env
# 修改 JWT_SECRET 等配置
```

#### 3. 启动服务

```bash
# 构建并启动
docker compose up -d --build

# 查看日志
docker compose logs -f

# 停止服务
docker compose down

# 重新构建
docker compose up -d --build
```

#### 4. 访问服务

- 前端: http://your-server-ip
- 后端 API: http://your-server-ip/api/v1

### Windows Server 部署

#### 前提条件

- Windows Server 2016+
- Node.js 20.x
- NSSM（Windows 服务包装器）
- IIS 10（可选）

#### 部署步骤

```powershell
# 1. 以管理员身份打开 PowerShell

# 2. 安装 Node.js
winget install OpenJS.NodeJS.LTS

# 3. 克隆代码
git clone <repository-url> C:\backend-admin
cd C:\backend-admin

# 4. 构建项目
npm install
cd frontend && npm install && npm run build && cd ..
npm run build

# 5. 运行部署脚本
cd deploy\windows
.\deploy.ps1 -Action deploy

# 可选：分步执行
.\deploy.ps1 -Action build          # 仅构建
.\deploy.ps1 -Action install        # 安装服务
.\deploy.ps1 -Action configure-iis  # 配置 IIS
.\deploy.ps1 -Action start         # 启动服务
```

#### 常用命令

```powershell
# 查看服务状态
Get-Service -Name "BackendAdmin"

# 停止服务
.\deploy.ps1 -Action stop

# 启动服务
.\deploy.ps1 -Action start

# 重启服务
.\deploy.ps1 -Action restart

# 更新部署
git pull
npm run build
.\deploy.ps1 -Action update
```

### Linux 部署

#### 前提条件

- Ubuntu 20.04+ / CentOS 8+
- Node.js 20.x
- Nginx
- systemd

#### 部署步骤

```bash
# 1. 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx

# 2. 创建部署目录
sudo mkdir -p /opt/backend-admin
sudo chown $USER:$USER /opt/backend-admin

# 3. 克隆代码
cd /opt/backend-admin
git clone <repository-url> .

# 4. 构建项目
npm install
cd frontend && npm install && npm run build && cd ..
npm run build

# 5. 运行部署脚本
cd deploy/linux
sudo ./deploy.sh install

# 可选：分步执行
sudo ./deploy.sh build      # 构建
sudo ./deploy.sh service    # 配置系统服务
sudo ./deploy.sh nginx      # 配置 Nginx
sudo ./deploy.sh start      # 启动服务
```

#### 常用命令

```bash
# 查看服务状态
sudo systemctl status backend-admin

# 启动/停止/重启
sudo systemctl start backend-admin
sudo systemctl stop backend-admin
sudo systemctl restart backend-admin

# 查看日志
journalctl -u backend-admin -f

# 备份数据库
sudo ./deploy.sh backup

# 配置 SSL
sudo ./deploy.sh ssl your-domain.com

# 更新部署
git pull
npm run build
sudo ./deploy.sh update /opt/backend-admin
```

### macOS 部署

#### 前提条件

- macOS 10.15+ (Catalina+)
- Node.js 20.x
- Homebrew
- Nginx

#### 部署步骤

```bash
# 1. 安装必要软件
brew install node nginx

# 2. 克隆代码
cd /opt/backend-admin
git clone <repository-url> .

# 3. 构建项目
npm install
cd frontend && npm install && npm run build && cd ..
npm run build

# 4. 运行部署脚本
cd deploy/macos
./deploy.sh install

# 可选：分步执行
./deploy.sh build    # 构建
./deploy.sh service  # 配置 launchd
./deploy.sh nginx    # 配置 Nginx
./deploy.sh start    # 启动服务
```

#### 常用命令

```bash
# 查看服务状态
./deploy.sh status

# 启动/停止/重启
./deploy.sh start
./deploy.sh stop
./deploy.sh restart

# 查看日志
tail -f /opt/backend-admin/logs/app.log

# 备份数据库
./deploy.sh backup

# 更新部署
git pull
npm run build
./deploy.sh update /opt/backend-admin
```

### Nginx 配置

#### 标准配置

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 前端静态文件
    root /path/to/frontend/dist;
    index index.html;
    
    # API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # SPA 路由
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### SSL 配置

```bash
# 使用 Certbot 配置 SSL
sudo certbot certonly --standalone -d your-domain.com

# 更新 Nginx 配置添加 SSL
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # ... 其他配置同上
}

# HTTP 重定向
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}
```

### 环境变量配置

#### 生产环境变量

```env
# 服务器
NODE_ENV=production
PORT=3000

# 安全
JWT_SECRET=<your-strong-secret-key>
JWT_EXPIRES_IN=3600s
CORS_ORIGINS=https://your-domain.com

# 数据库
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=admin
DB_PASSWORD=<your-password>
DB_DATABASE=backend_admin

# 日志
LOG_LEVEL=warn
LOG_FILE=/var/log/backend-admin/app.log
```

---

## 🔧 故障处理方法

### 常见问题排查

#### 1. 启动失败

**症状**: 服务无法启动，显示错误信息

**排查步骤**:

```bash
# 检查端口占用
# Windows
netstat -ano | findstr :3000
taskkill /F /PID <PID>

# Linux/macOS
lsof -i :3000
kill -9 <PID>

# 检查 Node.js 版本
node --version  # 需要 >= 20.x

# 检查依赖安装
npm install

# 删除 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install
```

#### 2. 数据库错误

**症状**: 数据库连接失败或数据访问错误

**排查步骤**:

```bash
# 检查数据库文件
# SQLite
ls -la database.sqlite
# 或
ls -la data/db.sqlite

# 检查文件权限
# Linux/macOS
chmod 644 database.sqlite
chown <user>:<user> database.sqlite

# Windows
icacls database.sqlite

# 重建数据库
node scripts/init-db.js
```

#### 3. API 请求失败

**症状**: 前端请求 API 返回错误

**排查步骤**:

```bash
# 测试 API 连通性
curl http://localhost:3000/api/v1/dashboard/stats

# 检查后端日志
# 开发模式：查看控制台
# 生产模式：
tail -f /var/log/backend-admin/app.log

# 检查 JWT 配置
cat .env | grep JWT

# 重启服务
# Linux
sudo systemctl restart backend-admin
# Windows
.\deploy.ps1 -Action restart
```

#### 4. 登录失败

**症状**: 用户名密码正确但无法登录

**排查步骤**:

```bash
# 重置管理员密码
node scripts/init-user.js

# 检查用户表
# SQLite
sqlite3 database.sqlite "SELECT * FROM users;"

# 重置所有数据
node scripts/reset-all-data.js
```

#### 5. 权限错误

**症状**: 访问功能时提示无权限

**排查步骤**:

```bash
# 检查用户角色
node -e "
const { User } = require('./dist/entity/user.entity');
const connection = require('./dist/main');
// 查询用户角色
"

# 更新用户为超级管理员
node scripts/update-user-role.js

# 检查角色配置
# 确保至少有一个 super_admin 用户
```

#### 6. Nginx 502 Bad Gateway

**症状**: Nginx 返回 502 错误

**排查步骤**:

```bash
# 检查后端服务
# Linux
sudo systemctl status backend-admin
# 应显示 "active (running)"

# 检查端口监听
# Linux
netstat -tlnp | grep 3000
# Windows
netstat -ano | findstr :3000

# 检查 Nginx 配置
nginx -t

# 查看 Nginx 错误日志
# Linux
tail -f /var/log/nginx/error.log
# macOS
tail -f /usr/local/var/log/nginx/error.log
```

#### 7. 静态资源加载失败

**症状**: 页面样式或脚本无法加载

**排查步骤**:

```bash
# 检查前端构建
cd frontend
npm run build

# 检查 Nginx 配置
# 确认 root 路径正确
cat /etc/nginx/conf.d/backend-admin.conf

# 检查文件权限
ls -la /path/to/frontend/dist/
chmod -R 755 /path/to/frontend/dist/
```

### 性能问题排查

#### 1. 内存占用过高

```bash
# 查看内存使用
# Linux
free -h
top

# Windows
tasklist /svc

# Docker
docker stats

# Node.js 内存分析
node --inspect dist/main
# 访问 chrome://inspect
```

#### 2. 响应缓慢

```bash
# 测量响应时间
curl -w "\nTime: %{time_total}s\n" http://localhost:3000/api/v1/dashboard/stats

# 检查数据库查询
# SQLite
sqlite3 database.sqlite ".timer on"
# PostgreSQL
EXPLAIN ANALYZE <query>

# 查看连接池
# 检查 active connections
```

#### 3. 并发问题

```bash
# 使用 PM2 多进程
npm install -g pm2
pm2 start dist/main -i max
pm2 save
pm2 startup

# 负载均衡
# 在 Nginx 配置多个 upstream
upstream backend {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}
```

### 恢复方案

#### 完整重置

```bash
# 1. 停止服务
# Linux
sudo systemctl stop backend-admin

# 2. 备份数据
cp database.sqlite database.sqlite.bak.$(date +%Y%m%d)

# 3. 清理并重建
rm -rf dist node_modules
npm install
npm run build

# 4. 重启服务
# Linux
sudo systemctl start backend-admin

# 5. 验证
curl http://localhost:3000/api/v1/dashboard/stats
```

#### 数据恢复

```bash
# 从备份恢复
cp database.sqlite.bak.20240101 database.sqlite

# 修复数据
node scripts/fix-data.js

# 重新初始化
node scripts/init-db.js
node scripts/seed-data.js
```

### 联系支持

如遇到无法解决的问题，请：

1. 查看日志文件
   - 后端日志: `logs/app.log`
   - Nginx日志: `/var/log/nginx/error.log`
   - 系统日志: `journalctl -u backend-admin`

2. 收集系统信息
   ```bash
   # 系统版本
   uname -a  # Linux
   systeminfo  # Windows
   sw_vers  # macOS
   
   # 软件版本
   node --version
   npm --version
   nginx -v
   
   # 资源使用
   free -h
   df -h
   top -bn1 | head -20
   ```

3. 提交 Issue
   - 提供详细的错误描述
   - 包含日志片段
   - 说明复现步骤
   - 附上系统环境信息

---

## 📄 项目开源声明

### 许可证

本项目采用 **MIT License** 开源协议。

```
MIT License

Copyright (c) 2024 Backend Admin System

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### 第三方依赖

#### 后端依赖

| 依赖 | 许可证 | 说明 |
|------|--------|------|
| [NestJS](https://nestjs.com/) | MIT | 渐进式 Node.js 框架 |
| [TypeORM](https://typeorm.io/) | MIT | TypeScript ORM |
| [Passport.js](http://www.passportjs.org/) | MIT | 认证中间件 |
| [JWT](https://jwt.io/) | MIT | Token 认证 |
| [SQLite3](https://www.sqlite.org/) | Public Domain | 嵌入式数据库 |
| [PostgreSQL](https://www.postgresql.org/) | PostgreSQL License | 关系型数据库 |
| [class-validator](https://github.com/typestack/class-validator) | MIT | 数据验证 |

#### 前端依赖

| 依赖 | 许可证 | 说明 |
|------|--------|------|
| [React](https://react.dev/) | MIT | UI 框架 |
| [Vite](https://vitejs.dev/) | MIT | 构建工具 |
| [Tailwind CSS](https://tailwindcss.com/) | MIT | CSS 框架 |
| [React Router](https://reactrouter.com/) | MIT | 路由库 |
| [Zustand](https://github.com/pmndrs/zustand) | MIT | 状态管理 |
| [Axios](https://axios-http.com/) | MIT | HTTP 客户端 |
| [Lucide React](https://lucide.dev/) | ISC | 图标库 |

### 使用条款

1. **商业使用**: 允许在商业项目中免费使用本软件
2. **修改代码**: 允许修改、定制化本软件
3. **分发**: 允许重新分发、 sublicense
4. **私人使用**: 允许私人项目使用
5. **版权声明**: 必须在软件副本中保留原始版权声明

### 贡献声明

本项目欢迎社区贡献。如果您想为项目做出贡献：

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add: amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 免责声明

本软件按"现状"提供，作者和贡献者不对任何直接或间接损失承担责任。

---

## 📚 附录

### 默认配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 端口 | 3000 | 后端服务端口 |
| JWT 过期 | 3600s | Token 有效期 |
| 数据库 | SQLite | 默认数据库类型 |
| 日志级别 | info | 日志详细程度 |
| 最大上传 | 10MB | 文件上传限制 |

### 默认账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 超级管理员 | admin@example.com | admin123 |

### 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0.0 | 2024 | 初始版本发布 |

---

<p align="center">
  <strong>Made with ❤️ by Backend Admin System Team</strong>
</p>
