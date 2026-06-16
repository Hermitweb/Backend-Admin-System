# 后台管理系统 — 开发文档

> 版本: 1.0.1 · 日期: 2026-06-04  
> 定位: 通用型后端管理平台，面向网站/应用的内容管理与 API 治理  
> 更新说明: 新增动态数据库连接管理、多项目独立数据库支持、丰富数据类型、测试数据填充

---

## 1. 项目概述

### 1.1 目标

构建一套**高兼容、可插拔**的后台管理系统，核心能力：

| 能力 | 说明 |
|------|------|
| 多项目接入 | 单实例管理 N 个项目，项目默认隔离，可选联动 |
| 接口自定义 | 可视化定义接口字段、校验规则、业务逻辑钩子 |
| API 文档自动生成 | 接口定义即文档，零维护成本，实时同步 |
| CRUD 操作 | 对内容的创建、读取、更新、删除全链路支持 |
| 高兼容 | 不限前端框架 / 后端语言，通过标准协议对接 |

### 1.2 设计原则

- **约定优于配置** — 90% 场景零配置开箱即用
- **声明式定义** — 用 Schema 声明资源，系统自动推导 API / 权限 / 文档
- **项目隔离优先** — 默认项目间数据与权限完全隔离，联动为显式 opt-in
- **渐进增强** — 从简单 CRUD 到复杂业务编排，平滑过渡

---

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                       管理后台 (Web UI)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌─────────┐ │
│  │ 项目管理  │ │ 接口定义  │ │ 内容管理  │ │ 文档中心 │ │ 数据库管理│ │
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘ └─────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                  API Gateway 层                                  │
│  鉴权 · 限流 · 路由 · 项目上下文注入 · 动态数据源路由              │
├─────────────────────────────────────────────────────────────────┤
│                  核心服务层                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐         │
│  │ Schema   │ │ CRUD     │ │ 联动引擎  │ │ 动态连接管理 │         │
│  │ Engine   │ │ Engine   │ │ Engine   │ │ Service     │         │
│  └──────────┘ └──────────┘ └──────────┘ └─────────────┘         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                         │
│  │ Hook     │ │ Doc      │ │ 通知/事件 │                         │
│  │ Runner    │ │ Generator│ │ Bus      │                         │
│  └──────────┘ └──────────┘ └──────────┘                         │
├─────────────────────────────────────────────────────────────────┤
│                  数据层                                          │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  SQLite (主库) · Redis (缓存/锁)                         │    │
│  │  OSS (文件存储)                                          │    │
│  │  ┌──────────────────────────────────────────────────┐    │    │
│  │  │  多项目独立数据库 (SQLite/PostgreSQL/MySQL)       │    │    │
│  │  │  - personal-homepage (个人主页)                   │    │    │
│  │  │  - portfolio (作品集)                             │    │    │
│  │  │  - blog-system (博客系统)                         │    │    │
│  │  │  - ecommerce (电商平台)                           │    │    │
│  │  │  - task-manager (任务管理)                        │    │    │
│  │  └──────────────────────────────────────────────────┘    │    │
│  └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 核心模块详细设计

### 3.1 动态数据库连接管理

#### 3.1.1 设计目标

支持每个项目使用独立的数据库连接，实现真正的数据隔离：

| 特性 | 说明 |
|------|------|
| 多数据库类型支持 | SQLite、PostgreSQL、MySQL |
| 动态连接池 | 根据项目动态创建和管理数据库连接 |
| 连接复用 | 相同连接配置复用现有连接 |
| 故障恢复 | 自动重连机制 |
| 连接隔离 | 项目间数据库连接完全隔离 |

#### 3.1.2 数据库连接模型

```yaml
DatabaseConnection:
  id: string(ulid)          # 连接ID
  project_id: string        # 所属项目ID
  name: string              # 连接名称
  type: enum(sqlite, postgresql, mysql)
  host: string              # 数据库主机 (非SQLite)
  port: integer             # 数据库端口
  database: string          # 数据库名/文件路径
  username: string          # 用户名
  password: string          # 密码 (加密存储)
  enabled: boolean          # 是否启用
  config: jsonb             # 额外配置 (连接池大小等)
  created_at: timestamp
  updated_at: timestamp
```

#### 3.1.3 动态连接服务

**DynamicConnectionService** 负责管理所有项目的数据库连接：

```typescript
class DynamicConnectionService {
  // 获取项目对应的数据库连接
  async getConnection(connection: DatabaseConnection): Promise<DataSource>
  
  // 构建连接配置
  buildConnectionOptions(connection: DatabaseConnection): DataSourceOptions
  
  // 释放连接
  releaseConnection(connectionKey: string): void
  
  // 检查连接状态
  async checkConnection(connection: DatabaseConnection): Promise<boolean>
}
```

**连接缓存策略**：
- 使用 `project_id_connection_id` 作为缓存键
- 连接初始化后存入 Map
- 定期检查连接状态，失效自动重建

#### 3.1.4 CRUD引擎集成

CRUD服务自动根据项目ID获取对应的数据库连接：

```typescript
class CrudService {
  private async getDataSource(projectId: string): Promise<DataSource> {
    // 1. 查询项目的数据库连接配置
    // 2. 通过 DynamicConnectionService 获取连接
    // 3. 如果没有配置，使用默认连接
  }
}
```

---

### 3.2 多项目管理

#### 3.2.1 项目模型

```yaml
Project:
  id: string(ulid)          # 全局唯一
  slug: string              # URL 友好标识, 唯一
  name: string              # 显示名
  description: text
  status: enum(active, suspended, archived)
  isolation: enum(strict, linked)   # 默认 strict
  linked_projects: string[]         # 联动项目 ID 列表
  config: jsonb                     # 项目级配置覆盖
  created_at: timestamp
  updated_at: timestamp
```

#### 3.1.2 隔离策略

| 策略 | 数据隔离 | 权限隔离 | API 隔离 | 联动 |
|------|---------|---------|---------|------|
| **strict** (默认) | ✅ 独立 Schema / 表前缀 | ✅ 独立角色体系 | ✅ 独立路由前缀 | ❌ |
| **linked** | ✅ 数据仍隔离 | ✅ 权限仍隔离 | ⚠️ 可跨项目调用 | ✅ 配置联动规则 |

#### 3.1.3 项目联动

联动允许项目之间安全地共享资源，**不打破数据隔离**：

```yaml
LinkRule:
  id: string
  source_project: string
  target_project: string
  resource_type: string       # 如 "article", "user", "media"
  link_mode: enum(read_only, read_write, sync)
  field_mapping: jsonb         # 字段映射规则
  conflict_strategy: enum(source_wins, target_wins, merge, error)
  enabled: boolean
```

**联动工作流：**

1. 项目 A 定义联动规则：`source=A, target=B, resource=article, mode=read_only`
2. 当 A 查询 article 时，联动引擎合并 B 的数据（只读，不回写）
3. `sync` 模式下，CRUD 操作同步到目标项目（异步队列，最终一致）

### 3.2 接口自定义（Schema Engine）

#### 3.2.1 资源 Schema 定义

每个项目的每种资源通过 Schema 声明，系统据此自动生成：

- 数据库表 / 字段
- RESTful API 端点
- 输入校验
- API 文档
- 管理后台 UI 表单

```yaml
# 示例: 文章资源定义
ResourceSchema:
  project: "blog"
  name: "article"
  display_name: "文章"
  fields:
    - name: id
      type: ulid
      primary: true
      auto: true
    - name: title
      type: string
      length: 200
      required: true
      searchable: true
      display: { width: "50%", sort: 1 }
    - name: content
      type: rich_text
      required: true
      display: { editor: true, sort: 2 }
    - name: status
      type: enum
      values: [draft, published, archived]
      default: draft
      filterable: true
    - name: tags
      type: relation
      target: tag
      cardinality: many_to_many
    - name: published_at
      type: timestamp
      nullable: true
    - name: created_at
      type: timestamp
      auto: true
    - name: updated_at
      type: timestamp
      auto: true
  indexes:
    - fields: [status, published_at]
    - fields: [title]
      type: fulltext       # 全文索引
  hooks:
    before_create: validate_slug
    after_create: notify_subscribers
    before_update: check_permission
```

#### 3.2.2 支持的字段类型

| 类型 | 数据库映射 | UI 组件 | 说明 |
|------|-----------|---------|------|
| `string` | VARCHAR(N) | Input | 有限长度文本 |
| `text` | TEXT | Textarea | 长文本 |
| `rich_text` | TEXT/JSONB | RichEditor | 富文本 (Markdown/HTML) |
| `email` | VARCHAR(255) | Input | 邮箱格式校验 |
| `phone` | VARCHAR(32) | Input | 手机号格式校验 |
| `url` | VARCHAR(512) | Input | URL格式校验 |
| `password` | VARCHAR(255) | PasswordInput | 密码字段（加密存储） |
| `integer` | BIGINT | NumberInput | 整数 |
| `decimal` | DECIMAL(P,S) | NumberInput | 精确小数 |
| `float` | FLOAT8 | NumberInput | 浮点数 |
| `boolean` | BOOLEAN | Switch | 布尔值 |
| `enum` | VARCHAR + CHECK | Select | 枚举 |
| `timestamp` | TIMESTAMPTZ | DateTimePicker | 时间戳 |
| `date` | DATE | DatePicker | 日期 |
| `time` | TIME | TimePicker | 时间 |
| `json` | JSONB | JsonEditor | 自由 JSON |
| `jsonb` | JSONB | JsonEditor | PostgreSQL JSONB |
| `ulid` | VARCHAR(26) | — | 有序唯一 ID |
| `uuid` | UUID | — | 标准 UUID |
| `relation` | FK / 关联表 | Select/Transfer | 关联关系 |
| `file` | VARCHAR (URL) | Upload | 文件/图片 |
| `image` | VARCHAR (URL) | ImageUpload | 图片上传 |
| `array` | JSONB | TagInput | 字符串数组 |
| `int_array` | INTEGER[] | NumberInput | 整数数组 |
| `decimal_array` | DECIMAL[] | NumberInput | 小数数组 |
| `point` | POINT | MapPicker | 地理坐标点 |
| `json_array` | JSONB | ArrayEditor | JSON数组 |
| `reference` | VARCHAR | Select | 引用其他资源 |

**字段属性说明：**

| 属性 | 类型 | 说明 |
|------|------|------|
| `name` | string | 字段名（唯一标识） |
| `label` | string | 显示标签 |
| `type` | string | 字段类型 |
| `required` | boolean | 是否必填 |
| `default` | any | 默认值 |
| `min` | number | 最小值（数字类型） |
| `max` | number | 最大值（数字类型） |
| `length` | number | 最大长度（字符串类型） |
| `options` | string[] | 枚举选项 |
| `searchable` | boolean | 是否可搜索 |
| `filterable` | boolean | 是否可筛选 |
| `sortable` | boolean | 是否可排序 |
| `nullable` | boolean | 是否允许为空 |
| `unique` | boolean | 是否唯一 |
| `display` | object | 显示配置（宽度、排序、编辑器类型等） |

#### 3.2.3 自定义接口（扩展 API）

除自动 CRUD 外，支持自定义接口：

```yaml
CustomEndpoint:
  project: "blog"
  resource: "article"
  name: "publish"
  method: POST
  path: "/articles/{id}/publish"
  description: "发布文章并通知订阅者"
  parameters:
    - name: id
      in: path
      type: ulid
      required: true
    - name: publish_at
      in: body
      type: timestamp
      required: false
      description: "定时发布时间"
  response:
    200:
      type: object
      fields:
        id: ulid
        status: string
        published_at: timestamp
  hooks:
    - before: validate_ownership
    - execute: do_publish        # 内置动作或自定义脚本
    - after: [notify_subscribers, update_search_index]
  auth:
    required: true
    roles: [editor, admin]
  rate_limit:
    window: 60s
    max: 30
```

#### 3.2.4 Hook 系统

Hook 分为三类，按执行阶段串行执行：

| 阶段 | Hook | 用途 |
|------|------|------|
| `before_*` | validate, transform, authorize | 校验、数据变换、鉴权 |
| `execute` | business logic | 核心业务逻辑 |
| `after_*` | notify, sync, audit | 副作用、联动同步、审计 |

Hook 实现方式（按优先级）：

1. **内置 Hook** — 系统预置，配置即用（如 `validate_required`, `set_timestamp`）
2. **脚本 Hook** — 项目级 JavaScript/TypeScript 脚本，沙箱运行
3. **Webhook Hook** — 调用外部 HTTP 端点
4. **插件 Hook** — 通过插件 SDK 注册的原生钩子

### 3.3 内容管理 (CRUD Engine)

#### 3.3.1 标准 CRUD API

每个资源自动生成以下端点：

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/{project}/api/{resource}` | 列表查询 (分页/筛选/排序) |
| `GET` | `/{project}/api/{resource}/{id}` | 单条详情 |
| `POST` | `/{project}/api/{resource}` | 创建 |
| `PUT` | `/{project}/api/{resource}/{id}` | 全量更新 |
| `PATCH` | `/{project}/api/{resource}/{id}` | 部分更新 |
| `DELETE` | `/{project}/api/{resource}/{id}` | 删除 (软删除优先) |

#### 3.3.2 查询能力

```
GET /blog/api/articles?
  page=1&                        # 页码
  page_size=20&                  # 每页条数
  sort=-published_at,title&       # 排序: -降序, +升序
  filter=status:eq:published&    # 精确匹配
  filter=title:like:OpenAI&      # 模糊匹配
  filter=created_at:gte:2026-01-01&  # 范围
  fields=id,title,status&        # 字段选择
  include=tags                    # 关联加载
```

**过滤操作符：**

| 操作符 | 说明 | 示例 |
|--------|------|------|
| `eq` | 等于 | `status:eq:published` |
| `neq` | 不等于 | `status:neq:deleted` |
| `gt/gte/lt/lte` | 比较 | `age:gte:18` |
| `like` | 模糊 | `title:like:AI` |
| `in` | 包含 | `status:in:draft,published` |
| `between` | 区间 | `price:between:10,100` |
| `is_null` | 空值 | `deleted_at:is_null` |

#### 3.3.3 批量操作

```
POST /{project}/api/{resource}/batch
{
  "action": "update",
  "ids": ["id1", "id2", "id3"],
  "data": { "status": "archived" }
}

POST /{project}/api/{resource}/batch
{
  "action": "delete",
  "ids": ["id1", "id2"],
  "mode": "soft"              # soft | hard
}
```

#### 3.3.4 内容版本控制

```yaml
VersionConfig:
  enabled: true                # 默认开启
  max_versions: 50             # 每条记录最大版本数
  diff_fields: true            # 是否存储字段级差异
  restore_enabled: true        # 允许版本回退
```

每次更新自动生成版本快照，可通过 API 查看历史和回退：

```
GET  /{project}/api/{resource}/{id}/versions
GET  /{project}/api/{resource}/{id}/versions/{version}
POST /{project}/api/{resource}/{id}/versions/{version}/restore
```

### 3.4 API 文档自动生成

#### 3.4.1 生成策略

文档基于 Schema + 自定义接口定义自动生成，**无需手动维护**：

| 来源 | 生成内容 |
|------|---------|
| 资源 Schema | CRUD 端点文档、字段说明、校验规则 |
| 自定义接口 | 请求/响应格式、参数说明 |
| Hook 定义 | 副作用描述、执行流程 |
| 联动规则 | 跨项目调用说明 |

#### 3.4.2 输出格式

支持多种文档格式输出：

```
GET /{project}/docs/openapi.json     # OpenAPI 3.1 规范
GET /{project}/docs/openapi.yaml     # YAML 格式
GET /{project}/docs/asyncapi.json    # AsyncAPI (WebSocket/事件)
GET /{project}/docs/graphql.schema   # GraphQL Schema (如启用)
GET /{project}/docs/postman.json    # Postman Collection
GET /{project}/docs/markdown         # Markdown 文档
```

#### 3.4.3 文档 UI

内置文档中心，特性：

- **Try it Out** — 文档内直接调试接口
- **项目切换** — 顶部下拉切换项目文档
- **变更日志** — 接口变更自动记录，含 diff 视图
- **SDK 生成** — 一键生成 TypeScript / Python / Go / Java SDK
- **Mock 服务** — 开发阶段自动返回 Mock 数据

#### 3.4.4 文档版本管理

```yaml
DocVersion:
  project: string
  version: string           # 语义化版本, 如 "1.2.0"
  snapshot: jsonb           # OpenAPI 快照
  changelog: text           # 自动生成的变更日志
  deprecated: string[]      # 已废弃端点列表
  created_at: timestamp
```

---

## 4. 技术实现规范

### 4.1 技术栈推荐

| 层级 | 技术选型 | 备选 |
|------|---------|------|
| 后端 | **Node.js + TypeScript** | Go, Python |
| 框架 | **NestJS** (模块化+DI) | Fastify, Express |
| 数据库 | **PostgreSQL 16+** | MySQL 8+ |
| 缓存 | **Redis 7+** | — |
| 搜索 | **Elasticsearch 8+** (可选) | MeiliSearch |
| 文件存储 | **MinIO / S3 兼容** | 阿里云 OSS |
| 消息队列 | **Redis Streams** (轻量) / RabbitMQ | Kafka |
| 前端 | **React + Ant Design Pro** | Vue + Element Plus |
| API 网关 | **内置** 或 Kong / APISIX | — |
| 容器化 | Docker + Docker Compose | K8s |

### 4.2 数据库设计

#### 4.2.1 多项目隔离方案

采用 **Schema 隔离**（PostgreSQL Schema）：

```sql
-- 系统库 (public schema): 存储项目元信息、用户、权限
CREATE TABLE public.projects (...);
CREATE TABLE public.users (...);
CREATE TABLE public.roles (...);

-- 项目库 (project_{slug} schema): 每个项目独立 Schema
CREATE SCHEMA project_blog;
CREATE SCHEMA project_shop;

-- 项目内表由 Schema Engine 自动创建
CREATE TABLE project_blog.articles (...);
CREATE TABLE project_blog.tags (...);
```

**优势：**
- 真正的数据物理隔离，无法跨项目误查
- 单 PostgreSQL 实例即可管理数百项目
- 备份/恢复可按项目独立操作

#### 4.2.2 核心表结构

```sql
-- ============ 系统层 ============

CREATE TABLE public.projects (
  id          ULID PRIMARY KEY DEFAULT gen_ulid(),
  slug        VARCHAR(64) UNIQUE NOT NULL,
  name        VARCHAR(128) NOT NULL,
  description TEXT,
  status      VARCHAR(16) NOT NULL DEFAULT 'active',
  isolation   VARCHAR(16) NOT NULL DEFAULT 'strict',
  config      JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.users (
  id          ULID PRIMARY KEY DEFAULT gen_ulid(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,     -- bcrypt
  name        VARCHAR(128),
  avatar      VARCHAR(512),
  status      VARCHAR(16) DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.project_members (
  project_id  ULID REFERENCES public.projects(id),
  user_id     ULID REFERENCES public.users(id),
  role        VARCHAR(32) NOT NULL DEFAULT 'viewer',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE public.resource_schemas (
  id          ULID PRIMARY KEY DEFAULT gen_ulid(),
  project_id  ULID REFERENCES public.projects(id),
  name        VARCHAR(128) NOT NULL,
  display_name VARCHAR(128),
  definition  JSONB NOT NULL,           -- 完整 Schema 定义
  version     INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, name)
);

CREATE TABLE public.custom_endpoints (
  id          ULID PRIMARY KEY DEFAULT gen_ulid(),
  project_id  ULID REFERENCES public.projects(id),
  resource    VARCHAR(128),
  name        VARCHAR(128) NOT NULL,
  method      VARCHAR(8) NOT NULL,
  path        VARCHAR(512) NOT NULL,
  definition  JSONB NOT NULL,
  enabled     BOOLEAN DEFAULT true,
  UNIQUE(project_id, method, path)
);

CREATE TABLE public.link_rules (
  id               ULID PRIMARY KEY DEFAULT gen_ulid(),
  source_project   ULID REFERENCES public.projects(id),
  target_project   ULID REFERENCES public.projects(id),
  resource_type    VARCHAR(128) NOT NULL,
  link_mode        VARCHAR(16) NOT NULL DEFAULT 'read_only',
  field_mapping    JSONB DEFAULT '{}',
  conflict_strategy VARCHAR(16) DEFAULT 'source_wins',
  enabled          BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.doc_versions (
  id          ULID PRIMARY KEY DEFAULT gen_ulid(),
  project_id  ULID REFERENCES public.projects(id),
  version     VARCHAR(32) NOT NULL,
  snapshot    JSONB NOT NULL,
  changelog   TEXT,
  deprecated  JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, version)
);

-- ============ 审计日志 ============

CREATE TABLE public.audit_logs (
  id          ULID PRIMARY KEY DEFAULT gen_ulid(),
  project_id  ULID,
  user_id     ULID,
  action      VARCHAR(32) NOT NULL,     -- create/update/delete/custom
  resource    VARCHAR(128) NOT NULL,
  record_id   VARCHAR(26),
  changes     JSONB,                    -- 变更前后快照
  ip          INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_project_time ON public.audit_logs(project_id, created_at DESC);
```

#### 4.2.3 项目内表自动生成规则

Schema Engine 根据 `resource_schemas.definition` 自动 DDL：

```sql
-- 以 blog 项目的 article 为例
CREATE TABLE project_blog.article (
  id            VARCHAR(26) PRIMARY KEY,
  title         VARCHAR(200) NOT NULL,
  content       TEXT NOT NULL,
  status        VARCHAR(16) NOT NULL DEFAULT 'draft'
                 CHECK(status IN ('draft','published','archived')),
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ               -- 软删除
);

-- 关联表
CREATE TABLE project_blog.article_tag (
  article_id  VARCHAR(26) REFERENCES project_blog.article(id),
  tag_id      VARCHAR(26) REFERENCES project_blog.tag(id),
  PRIMARY KEY (article_id, tag_id)
);

-- 版本表
CREATE TABLE project_blog.article_versions (
  id           ULID PRIMARY KEY DEFAULT gen_ulid(),
  record_id    VARCHAR(26) NOT NULL,
  version      INTEGER NOT NULL,
  snapshot     JSONB NOT NULL,
  diff         JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(record_id, version)
);
```

### 4.3 API 设计规范

#### 4.3.1 路由结构

```
/api/v1/{project}/{resource}              # 标准 CRUD
/api/v1/{project}/{resource}/{id}         # 单条操作
/api/v1/{project}/{resource}/{id}/{action} # 自定义动作
/api/v1/{project}/docs/{format}           # 文档导出
/api/v1/_system/projects                  # 项目管理
/api/v1/_system/users                     # 用户管理
/api/v1/_system/schemas                   # Schema 管理
```

#### 4.3.2 统一响应格式

```typescript
// 成功响应
interface ApiResponse<T> {
  code: number;        // 业务码, 0=成功
  message: string;     // 人类可读消息
  data: T;             // 业务数据
  meta?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

// 列表响应
interface ListResponse<T> {
  code: 0;
  message: "success";
  data: T[];
  meta: PaginationMeta;
}

// 错误响应
interface ErrorResponse {
  code: number;        // 业务错误码
  message: string;
  errors?: FieldError[];
}
```

#### 4.3.3 错误码体系

| 范围 | 说明 |
|------|------|
| `0` | 成功 |
| `1000-1999` | 参数校验错误 |
| `2000-2999` | 鉴权/权限错误 |
| `3000-3999` | 资源不存在/冲突 |
| `4000-4999` | 业务逻辑错误 |
| `5000-5999` | 系统/基础设施错误 |

### 4.4 鉴权与权限

#### 4.4.1 认证方式

- **JWT** — 主认证方式，支持 Refresh Token
- **API Key** — 服务间调用，按项目隔离
- **OAuth 2.0** — 第三方登录集成

```typescript
// JWT Payload
interface TokenPayload {
  sub: string;           // user_id
  projects: {
    project_id: string;
    role: string;
  }[];
  iat: number;
  exp: number;
}
```

#### 4.4.2 RBAC 权限模型

```yaml
# 项目级角色
Roles:
  admin:
    permissions: ["*"]     # 全部权限
  editor:
    permissions:
      - "resource:*:read"
      - "resource:*:create"
      - "resource:*:update"
      - "resource:article:publish"   # 细粒度
  viewer:
    permissions:
      - "resource:*:read"

# 权限格式
Permission: "{scope}:{resource}:{action}"
# scope:    resource | system | docs
# resource: * | resource_name
# action:   * | create | read | update | delete | custom_action
```

### 4.5 兼容性设计

#### 4.5.1 多框架兼容

系统通过标准协议对接，不绑定特定框架：

| 兼容维度 | 方案 |
|---------|------|
| 前端框架 | 提供 RESTful API + OpenAPI 规范，任意前端可对接 |
| 后端语言 | 生成多语言 SDK，Webhook 回调 |
| 数据库 | 支持 PostgreSQL (主) / MySQL (备) |
| 部署环境 | Docker / 裸机 / K8s 均支持 |
| 旧系统迁移 | 提供 Import API 批量导入数据与 Schema |

#### 4.5.2 版本兼容

```yaml
API Versioning:
  strategy: url_path          # /api/v1/ vs /api/v2/
  deprecation:
    notice_period: 90d        # 废弃前至少 90 天通知
    header: Sunset            # 标准 Sunset header
    docs_flag: true           # 文档中标注废弃
  migration_guide: auto       # 自动生成迁移指南
```

---

## 5. 管理后台 UI — 100% 图形化操作

### 5.1 设计理念

**核心原则: 零代码操作 — 所有功能均可通过可视化界面完成，无需编写任何代码。**

- 所见即所得：每一步操作都有即时视觉反馈
- 操作可逆：重要操作前预览确认，支持撤回
- 引导式流程：复杂操作拆解为向导式分步引导
- 状态可视化：资源、接口、联动关系全部图形化呈现

### 5.2 全局布局

```
┌──────────────────────────────────────────────────────────────┐
│  🏠 首页   │   🔍 全局搜索   │   🔔 通知  │   👤 管理员 ▾   │
│ ──────────────────────────────────────────────────────────── │
│  ┌──────┐  当前项目: [ 📦 博客系统 ▾ ]   [ ⚙ 全局设置 ]     │
│  │ 📊   │──────────────────────────────────────────────────── │
│  │ 概览  │                                                    │
│  │──────│  ┌──────────────────────────────────────────────┐    │
│  │ 📝   │  │  面包屑: 博客系统 > 内容管理 > 文章          │    │
│  │ 内容  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐   │    │
│  │──────│  │  │ ✏️ 新建  │  │ 📥 导入 │  │ 📤 导出 │   │    │
│  │ 🔧   │  │  └─────────┘  └─────────┘  └─────────┘   │    │
│  │ 接口  │  ├──────────────────────────────────────────────┤    │
│  │──────│  │                                              │    │
│  │ 📖   │  │          主内容区域                          │    │
│  │ 文档  │  │     (表格 / 表单 / 图表 / 编辑器)           │    │
│  │──────│  │                                              │    │
│  │ 🔗   │  │                                              │    │
│  │ 联动  │  └──────────────────────────────────────────────┘    │
│  │──────│                                                    │
│  │ 👥   │  ┌──────────────────────────────────────────────┐    │
│  │ 成员  │  │  状态栏: 共 1,542 条 · 已选 3 条 · 保存成功  │    │
│  │──────│  └──────────────────────────────────────────────┘    │
│  │ 📋   │                                                    │
│  │ 日志  │                                                    │
│  └──────┘                                                    │
└──────────────────────────────────────────────────────────────┘
```

### 5.3 核心页面详细设计

#### 5.3.1 📊 项目概览 (Dashboard)

```
┌────────────────────────────────────────────────────────────┐
│  博客系统 — 项目概览                    [已运行 45 天] ✅  │
├──────────┬──────────┬──────────┬──────────┬───────────────┤
│ 📝 8 种  │ 📄 1,542│ 👥 12 人 │ 🔌 5 个  │ ⚠️ 0 个告警  │
│ 资源类型  │  条内容   │ 团队成员  │  自定义接口│              │
├──────────┴──────────┴──────────┴──────────┴───────────────┤
│                                                            │
│  📈 内容趋势 (30天)                                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │    ╱╲     ╱╲                                        │   │
│  │   ╱  ╲   ╱  ╲   ╱╲                                  │   │
│  │  ╱    ╲_╱    ╲_╱  ╲_                                │   │
│  │ 新增    更新    发布                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                            │
│  ⚡ 近期操作                    🔗 项目联动关系图            │
│  ┌────────────────────────┐   ┌────────────────────────┐   │
│  │ 🟢 张三 发布了文章《...》│   │   ┌──────┐  read_only  │   │
│  │ 🟢 李四 新增标签 3 个   │   │   │ 博客 │────────▶ 商城 │   │
│  │ 🟡 王五 修改了接口 publish│   │   └──────┘             │   │
│  │ 🔴 系统 WAF 触发 3 次   │   │   ┌──────┐  read_write │   │
│  └────────────────────────┘   │   │ 博客 │────────▶ 官网 │   │
│                                │   └──────┘             │   │
│                                └────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

#### 5.3.2 📝 内容管理 — 100% 可视化 CRUD

**列表视图 — 无需写任何查询语句：**

```
┌──────────────────────────────────────────────────────────────────┐
│  文章管理                                           [ 🔍 搜索 ]  │
│  ┌─────┬────────────────┬──────────┬─────┬──────────┬────────┐  │
│  │ ☐   │ 标题            │ 状态      │ 标签 │ 发布时间   │ 操作   │  │
│  ├─────┼────────────────┼──────────┼─────┼──────────┼────────┤  │
│  │ ☐   │ AI 技术趋势...  │ 🟢已发布  │ 技术│ 06-01    │ ⋯     │  │
│  │ ☐   │ 系统架构设计...  │ 🟡草稿    │ 架构│ —        │ ⋯     │  │
│  │ ☐   │ 数据安全指南...  │ 🟢已发布  │ 安全│ 05-28    │ ⋯     │  │
│  └─────┴────────────────┴──────────┴─────┴──────────┴────────┘  │
│                                                              │
│  📊 已选 0 条  │  共 1,542 条  │  第 1/78 页  │               │
│  [◀ 上一页] [1][2][3]...[78] [下一页 ▶]  每页 [20 ▾]          │
│                                                              │
│  筛选器:                                                    │
│  状态: [全部 ▾]  标签: [全部 ▾]  日期: [选择范围 📅]  [清除]  │
└──────────────────────────────────────────────────────────────────┘

操作菜单 (⋯):
  ┌──────────┐
  │ 👁 查看详情 │
  │ ✏️ 编辑    │
  │ 📋 复制    │
  │ 📄 版本历史 │
  │ ────────── │
  │ 🗑 删除    │
  └──────────┘
```

**新建/编辑 — 拖拽式表单，由 Schema 自动生成：**

```
┌────────────────────────────────────────────────────────────┐
│  新建文章                                    [ 保存草稿 ] [ 发布 ] │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  标题 *                                                    │
│  ┌────────────────────────────────────────────────────┐   │
│  │ 请输入文章标题...                                      │   │
│  └────────────────────────────────────────────────────┘   │
│  ⚠️ 必填字段，最多 200 字                                  │
│                                                            │
│  内容 *                              [   ] [  B  I  链接 ] │
│  ┌────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  富文本编辑器 (自动根据 Schema 字段类型选择组件)        │   │
│  │  支持 Markdown / 可视化编辑 双模式切换                 │   │
│  │                                                     │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  状态          标签                                        │
│  ┌──────────┐  ┌──────────────────────────────────────┐   │
│  │ 🟡 草稿 ▾  │  │ [技术 ✕] [架构 ✕] [+ 添加标签]       │   │
│  └──────────┘  └──────────────────────────────────────┘   │
│                                                            │
│  发布时间 (可选)                                            │
│  ┌──────────────────────┐                                 │
│  │ 📅 选择日期和时间       │  ☑ 定时发布                    │
│  └──────────────────────┘                                 │
│                                                            │
│  📎 附件上传                                             │
│  ┌─────────────────────────────────────┐                  │
│  │  📁 拖拽文件到此处或 [点击上传]         │                  │
│  │  支持 JPG/PNG/PDF, 单文件 ≤ 50MB     │                  │
│  └─────────────────────────────────────┘                  │
│                                                            │
│  ⚡ 高级设置 ▾                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │  SEO 标题: [________________]                        │   │
│  │  SEO 描述: [________________]                        │   │
│  │  自定义字段: [点击添加自定义键值对]                       │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
└────────────────────────────────────────────────────────────┘

  表单组件自动映射:     Schema 字段类型 → UI 组件
  ─────────────────────────────────────────────
  string          → 文本输入框
  text            → 多行文本框
  rich_text       → 富文本编辑器
  enum            → 下拉选择器
  boolean         → 开关组件
  timestamp/date  → 日期时间选择器
  integer/decimal → 数字输入框
  json            → JSON 编辑器 (语法高亮)
  relation        → 关联选择器 (支持搜索)
  file            → 文件上传组件
  array           → 标签输入 / 列表编辑器
```

**批量操作 — 可视化选择 + 确认预览：**

```
┌─────────────────────────────────────────────────────────┐
│  📊 已选 3 条记录                                          │
│                                                            │
│  请选择操作:                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ ✏️ 批量编辑│ │ 🗑 批量删除│ │ 📤 批量导出│ │ 🏷 批量打标│    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│                                                            │
│  (选择「批量编辑」后)                                       │
│  ┌────────────────────────────────────────────────────┐   │
│  │  选择要修改的字段:                                    │   │
│  │  ┌──────────────┐                                   │   │
│  │  │ 状态: 已发布 ▾ │  ☑ 仅修改此字段 (保留其他字段不变)  │   │
│  │  └──────────────┘                                   │   │
│  │                                                      │   │
│  │  ⚠️ 预览: 以下 3 条记录的状态将被修改为「已发布」         │   │
│  │  ├─ 文章 #A001: AI 技术趋势...  草稿 → 已发布        │   │
│  │  ├─ 文章 #A002: 系统架构设计...  草稿 → 已发布        │   │
│  │  └─ 文章 #A003: 数据安全指南...  草稿 → 已发布        │   │
│  │                                                      │   │
│  │              [取消]  [确认修改 (3条)]                   │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

#### 5.3.3 🔧 接口定义器 — 可视化 API 构建

**零代码定义接口，所见即所得：**

```
┌────────────────────────────────────────────────────────────┐
│  自定义接口定义                                   [ 保存 ]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  步骤 ① 基本信息    ② 请求参数    ③ 响应定义    ④ 钩子配置  │
│  ●──────────○────────────○────────────○                     │
│                                                            │
│  ─── 步骤 ① 基本信息 ───                                    │
│                                                            │
│  接口名称 *                方法        路径                 │
│  ┌──────────────────┐    ┌─────┐  ┌──────────────────┐    │
│  │ 发布文章           │    │POST▾│  │/articles/{id}/publish│   │
│  └──────────────────┘    └─────┘  └──────────────────┘    │
│                                                            │
│  描述: 用户点击发布按钮时触发的接口                           │
│  ┌────────────────────────────────────────────────────┐   │
│  │ 将文章状态从草稿变更为已发布，并发送通知                 │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  鉴权要求                    速率限制                       │
│  ┌──────────────┐          ┌──────────────────────┐       │
│  │ ☑ 需要登录    │          │ 30 次 / 分钟          │       │
│  │ 允许角色:     │          └──────────────────────┘       │
│  │ [☑ admin ✕]   │                                        │
│  │ [☑ editor ✕] │                                        │
│  │ [☐ viewer ✕] │                                        │
│  └──────────────┘                                        │
│                                                            │
│  ─── 步骤 ② 请求参数 (拖拽排序, 点击添加) ───                 │
│                                                            │
│  ┌────┬──────────┬────────┬────┬──────┬──────────┐        │
│  │ #  │ 参数名    │ 来源   │ 类型│ 必填 │ 说明      │        │
│  ├────┼──────────┼────────┼────┼──────┼──────────┤        │
│  │ 1  │ id       │ Path ▾  │ ULID│ ☑   │ 文章ID    │        │
│  │ 2  │ publish_at│ Body ▾  │ 时间│ ☐   │ 定时发布  │        │
│  └────┴──────────┴────────┴────┴──────┴──────────┘        │
│  [+ 添加参数]                                               │
│                                                            │
│  ─── 步骤 ③ 响应定义 ───                                    │
│                                                            │
│  成功响应 (200):                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │  { "id": "01HXYZ", "status": "published", ... }    │   │
│  └────────────────────────────────────────────────────┘   │
│  [可视化字段编辑器] [JSON 预览]                              │
│                                                            │
│               [取消]  [下一步 →]                            │
└────────────────────────────────────────────────────────────┘
```

#### 5.3.4 📐 Schema 可视化编辑器

**拖拽添加字段，可视化配置属性：**

```
┌────────────────────────────────────────────────────────────┐
│  资源定义: 文章 (article)          [预览API] [预览表单]      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  拖拽或点击添加字段:                                         │
│  ┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐ │
│  │ 📝   ││ 📄   ││ 🔢   ││ 💾   ││ 📅   ││ 🏷️   ││ 🔗   │ │
│  │ 文本  ││ 长文本││ 数字  ││ 开关  ││ 日期  ││ 枚举  ││ 关联  │ │
│  └──────┘└──────┘└──────┘└──────┘└──────┘└──────┘└──────┘ │
│  ┌──────┐┌──────┐┌──────┐┌──────┐                        │
│  │ 📁   ││ 📋   ││ 🔑   ││ ☑️   │                        │
│  │ 文件  ││ JSON ││ 引用  ││ 数组  │                        │
│  └──────┘└──────┘└──────┘└──────┘                        │
│                                                            │
│  已定义字段 (拖拽排序):                                      │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ⠿  📝 title         文本     必填 ☑  搜索 ☑  ≤200字   │ │
│  │ ⠿  📄 content        长文本    必填 ☑  富文本编辑器     │ │
│  │ ⠿  🏷️ status         枚举     默认: 草稿  [管理 ▾]    │ │
│  │ ⠿  🔗 tags           关联     → tag  多对多            │ │
│  │ ⠿  📅 published_at   日期     可选    定时发布          │ │
│  │ ⠿  🔑 id             引用     主键    自动生成           │ │
│  │ ⠿  📅 created_at     日期     自动    系统自动填充       │ │
│  │ ⠿  📅 updated_at     日期     自动    系统自动填充       │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  点击字段展开配置面板:                                        │
│  ┌── title 字段配置 ─────────────────────────────────────┐ │
│  │  显示名: [文章标题]       字段名: title                 │ │
│  │  类型:   文本 ▾          长度: [200]                    │ │
│  │  必填:   ☑              默认值: [___________]          │ │
│  │  搜索:   ☑              筛选: ☐              排序: ☑  │ │
│  │  验证规则: [+ 添加规则]                                 │ │
│  │    ├─ 正则: ^.{1,200}$                                 │ │
│  │    └─ 唯一: ☐                                          │ │
│  │  列表显示: 宽度 [50% ▾]                                 │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                            │
│  💡 实时预览: 自动生成的 API 端点和表单布局                    │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  API: POST/GET/PUT/DELETE /blog/api/articles          │ │
│  │  表单: [标题输入] [富文本区] [状态下拉] [标签选择]       │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### 5.3.5 🔗 联动管理 — 可视化关系图谱

```
┌────────────────────────────────────────────────────────────┐
│  项目联动管理                              [+ 新建联动规则]   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  🗺️ 联动关系图谱 (实时):                                     │
│                                                            │
│       ┌──────────┐                                        │
│       │ 📦 博客  │                                        │
│       └────┬─────┘                                        │
│      ┌─────┼─────┬─────────────┐                           │
│      │     │     │             │                           │
│  read_only │ │ read_write │ sync                           │
│      │     │     │             │                           │
│   ┌──┴──┐ ┌┴───┐ ┌┴───┐  ┌──┴──┐                         │
│   │ 商城│ │官网 │ │论坛 │  │APP  │                         │
│   └─────┘ └────┘ └────┘  └─────┘                         │
│                                                            │
│  点击连线查看/编辑规则:                                       │
│  ┌── 博客 → 商城 (article, read_only) ──────────────────┐ │
│  │  资源: article                                          │ │
│  │  模式: 📖 只读                                          │ │
│  │  字段映射:                                              │ │
│  │    title → title        ✅ 一致                        │ │
│  │    content → description ✅ 自动映射                   │ │
│  │    tags → categories    ⚠️ 类型不同, 自动转换          │ │
│  │  同步频率: [实时 ▾]                                     │ │
│  │  冲突策略: [源优先 ▾]                                    │ │
│  │  状态: ✅ 正常运行 · 上次同步: 2分钟前                    │ │
│  │              [暂停] [编辑] [删除]                        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### 5.3.6 📖 文档中心 — 交互式 API 文档

```
┌────────────────────────────────────────────────────────────┐
│  API 文档中心  [博客系统 ▾]  [OpenAPI 📥] [SDK 📥]         │
├──────────┬─────────────────────────────────────────────────┤
│          │                                                 │
│ 文章 API │  POST /blog/api/articles          创建文章      │
│ ├ 创建   │  ─────────────────────────────────────────────  │
│ ├ 详情   │  请求参数 (点击展开):                              │
│ ├ 更新   │  ┌─ Body (application/json) ──────────────────┐│
│ ├ 删除   │  │ {                                          ││
│ └ 列表   │  │   "title": "string (必填)",               ││
│          │  │   "content": "string (必填)",             ││
│ 标签 API │  │   "status": "draft|published|archived",    ││
│ ├ ...    │  │   "tags": ["string"]                      ││
│          │  │ }                                          ││
│ 自定义   │  └─────────────────────────────────────────────┘│
│ ├ 发布   │                                                 │
│ └ ...    │  响应示例 (200):                                 │
│          │  ┌─────────────────────────────────────────────┐│
│          │  │ { "code": 0, "data": { "id": "01H..." }} ││
│          │  └─────────────────────────────────────────────┘│
│          │                                                 │
│          │  [🧪 Try it Out]  ← 填入参数, 直接调试接口       │
│          │  ┌─────────────────────────────────────────────┐│
│          │  │ title: [AI 技术趋势________]                 ││
│          │  │ content: [本文探讨了...____]                 ││
│          │  │ status: [草稿 ▾]                             ││
│          │  │              [发送请求]                       ││
│          │  ├─────────────────────────────────────────────┤│
│          │  │ ⏱ 42ms  │  200 OK                           ││
│          │  │ 响应: { "code": 0, "data": {...} }          ││
│          │  └─────────────────────────────────────────────┘│
│          │                                                 │
└──────────┴─────────────────────────────────────────────────┘
```

#### 5.3.7 👥 成员与权限管理

```
┌────────────────────────────────────────────────────────────┐
│  团队管理                                   [+ 邀请成员]     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  成员列表:                                                  │
│  ┌─────────┬──────────┬────────┬──────────┬──────────┐     │
│  │ 头像     │ 姓名     │ 邮箱    │ 角色      │ 加入时间  │     │
│  ├─────────┼──────────┼────────┼──────────┼──────────┤     │
│  │ 👤      │ 张三     │ z@...  │ 👑 管理员 │ 2026-01 │     │
│  │ 👤      │ 李四     │ l@...  │ ✏️ 编辑   │ 2026-02 │     │
│  │ 👤      │ 王五     │ w@...  │ 👁 查看者 │ 2026-03 │     │
│  └─────────┴──────────┴────────┴──────────┴──────────┘     │
│                                                            │
│  权限矩阵 (可视化勾选):                                       │
│  ┌──────────┬───────────┬────┬────┬────┬────┬────────┐     │
│  │ 资源      │ 操作      │管理员│编辑 │查看者│自定义│        │     │
│  ├──────────┼───────────┼────┼────┼────┼────┼────────┤     │
│  │ 文章      │ 创建       │ ☑ │ ☑ │ ☐ │ ☐ │        │     │
│  │ 文章      │ 读取       │ ☑ │ ☑ │ ☑ │ ☑ │        │     │
│  │ 文章      │ 更新       │ ☑ │ ☑ │ ☐ │ ☑ │        │     │
│  │ 文章      │ 删除       │ ☑ │ ☐ │ ☐ │ ☐ │        │     │
│  │ 文章      │ 发布       │ ☑ │ ☑ │ ☐ │ ☑ │ ← 自定义 │     │
│  │ 标签      │ 管理       │ ☑ │ ☑ │ ☐ │ ☐ │        │     │
│  └──────────┴───────────┴────┴────┴────┴────┴────────┘     │
│                                                            │
│  API Key 管理:                                              │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  🔑 前端读专用    ask_xxxxxxxxx...    [复制] [撤销]     │ │
│  │  🔑 后端管理      ask_yyyyyyyyyy...    [复制] [撤销]     │ │
│  │  🔑 数据导入      ask_zzzzzzzzzz...    [复制] [撤销]     │ │
│  │                       [+ 创建 API Key]                  │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### 5.4 导出与备份 — 图形化操作

```
┌────────────────────────────────────────────────────────────┐
│  导出中心                                                   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  选择导出类型:                                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ 📦 项目全量   │ │ ⚙️ 仅配置     │ │ 🔌 仅API配置  │       │
│  │ 含数据+文件   │ │ Schema+接口   │ │ Schema+接口   │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                            │
│  (选择「项目全量」后)                                        │
│  导出范围:                                                   │
│  资源: ☑ 全部  ☐ 仅选: [☑article ☑tag ☐comment]            │
│  数据: ☑ 包含数据  ☐ 仅结构                                  │
│  文件: ☑ 包含文件  ☐ 不含                                    │
│  加密: ☑ AES-256 加密  ☐ 不加密                              │
│                                                            │
│  历史导出:                                                   │
│  ┌──────┬─────────┬────────┬────────┬────────┐              │
│  │ 类型  │ 时间     │ 大小    │ 状态    │ 操作   │              │
│  ├──────┼─────────┼────────┼────────┼────────┤              │
│  │ 全量  │ 06-01   │ 150MB │ ✅ 完成 │ ⬇下载  │              │
│  │ 配置  │ 05-28   │ 2.1MB │ ✅ 完成 │ ⬇下载  │              │
│  └──────┴─────────┴────────┴────────┴────────┘              │
│                                                            │
│  备份管理:                                                   │
│  自动备份: ☑ 已开启  每天 02:00  保留 30 天                   │
│  [立即备份] [恢复备份] [备份设置]                              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 5.5 全局操作向导

复杂操作拆解为分步向导，引导用户逐步完成：

```
┌────────────────────────────────────────────────────────────┐
│  🚀 新建项目向导                                             │
│                                                            │
│  步骤 1/4 ─ 基本信息                                        │
│  ● ─────── ○ ─────── ○ ─────── ○                           │
│                                                            │
│  项目名称 *     项目标识 *                                   │
│  ┌──────────┐  ┌──────────┐                               │
│  │ 博客系统   │  │ blog      │                               │
│  └──────────┘  └──────────┘                               │
│  ⚠️ 标识创建后不可修改                                       │
│                                                            │
│  描述 (可选):                                               │
│  ┌────────────────────────────────────────────────────┐   │
│  │ 公司技术博客管理平台                                  │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  隔离模式:                                                 │
│  ┌─────────────────┐  ┌─────────────────┐                │
│  │ 🔒 完全隔离 (推荐)│  │ 🔗 允许联动     │                │
│  └─────────────────┘  └─────────────────┘                │
│                                                            │
│  ── → 下一步: 选择资源模板 ──                                │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  🚀 新建项目向导 (步骤 2/4)                                  │
│                                                            │
│  选择资源模板 (可多选, 后续可增删):                           │
│  ┌────────────────────────────────────────────────────┐   │
│  │  ☑ 📝 文章 — 标题、内容、状态、标签                     │   │
│  │  ☑ 🏷️ 标签 — 名称、颜色、描述                        │   │
│  │  ☑ 👤 用户 — 昵称、邮箱、头像                         │   │
│  │  ☑ 💬 评论 — 内容、关联文章、审核状态                  │   │
│  │  ☐ 📁 分类 — 名称、层级关系                          │   │
│  │  ☐ 📊 统计 — PV/UV/点赞                               │   │
│  │  [+ 从空白创建]  [📥 导入已有 Schema]                   │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  ⬅ 上一步 ───────────────── 下一步: 团队设置 ──→           │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  🚀 新建项目向导 (步骤 3/4)                                  │
│                                                            │
│  团队设置 (可选, 后续可添加):                                 │
│  ┌────────────────────────────────────────────────────┐   │
│  │  ☑ 创建默认角色: admin / editor / viewer            │   │
│  │  ☑ 添加当前用户为管理员                               │   │
│  │  ☐ 邀请团队成员: [输入邮箱地址, 回车添加]              │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  ⬅ 上一步 ───────────────── 下一步: 确认 ──→               │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  🚀 新建项目向导 (步骤 4/4)                                  │
│                                                            │
│  确认信息:                                                   │
│  ┌────────────────────────────────────────────────────┐   │
│  │  项目名称: 博客系统                                    │   │
│  │  项目标识: blog                                       │   │
│  │  隔离模式: 🔒 完全隔离                                 │   │
│  │  资源: 文章、标签、用户、评论 (4种)                     │   │
│  │  角色: admin, editor, viewer (3个)                    │   │
│  │  将自动生成: 8个 API 端点 + 完整文档                    │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  ⚠️ 创建后资源模板不可删除 (仅可隐藏), 标识不可修改          │
│                                                            │
│              ⬅ 上一步    [取消]    [🚀 创建项目]            │
└────────────────────────────────────────────────────────────┘
```

---

## 6. 部署方案 — 一键式自动化部署

### 6.1 设计理念

**核心原则: 一键启动，零手动配置 — 运行一条命令即可完成全部部署。**

- 自动检测运行环境（OS、已安装软件、端口占用）
- 自动补齐缺失依赖（Docker、Docker Compose 或 Node.js 等）
- 自动生成安全凭证（密码、密钥、Token）
- 自动完成数据库初始化、缓存配置、服务编排
- 自动执行健康检查，部署完成即可用

### 6.2 一键部署命令

```bash
# 唯一需要执行的命令
curl -fsSL https://get.admin-system.dev | bash

# 或者直接下载安装器
wget https://releases.admin-system.dev/install.sh -O install.sh
bash install.sh
```

### 6.3 自动化部署流程

```
用户执行: bash install.sh
         │
         ▼
┌─────────────────────────────────────┐
│  Phase 1: 环境检测                     │
│  (全程可视化进度条)                     │
│                                     │
│  ✅ 操作系统: Linux x86_64           │
│  ✅ CPU: 4 核 (≥ 2 核)               │
│  ✅ 内存: 16GB (≥ 4GB)              │
│  ✅ 磁盘: 100GB 可用 (≥ 20GB)        │
│  ⚠️ Docker: 未安装 → 自动安装         │
│  ⚠️ Docker Compose: 未安装 → 自动安装│
│  ✅ 端口 3000: 未占用                 │
│  ✅ 端口 5432: 未占用                 │
│  ✅ 端口 6379: 未占用                 │
│  ⚠️ 域名: 未配置 (可选, 后续可配)      │
│                                     │
│  📊 环境检测完成: 4 通过, 2 需补齐     │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Phase 2: 依赖安装                     │
│                                     │
│  正在安装 Docker...  ████████░░ 80%   │
│  正在安装 Docker Compose... 等待中    │
│                                     │
│  安装方式:                           │
│  - 优先使用系统包管理器 (apt/yum/brew) │
│  - 备选: 官方脚本安装                  │
│  - Windows: 自动下载 Docker Desktop   │
│                                     │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Phase 3: 配置生成                     │
│                                     │
│  ✅ 生成 JWT 密钥对 (RS256)           │
│  ✅ 生成数据库密码 (Argon2id)         │
│  ✅ 生成 API Key 签名密钥              │
│  ✅ 生成加密主密钥 (AES-256)          │
│  ✅ 生成 TLS 自签名证书 (后续替换)    │
│  ✅ 写入配置文件 .env                 │
│                                     │
│  ⚠️ 密钥已安全存储到 .env (权限 600)   │
│  ⚠️ 请妥善备份 .env 文件               │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Phase 4: 服务部署                     │
│                                     │
│  拉取镜像...          ████████░░ 80%  │
│  启动 PostgreSQL...   ✅              │
│  启动 Redis...        ✅              │
│  启动应用服务...      ✅              │
│  启动反向代理...      ✅              │
│                                     │
│  📦 部署模式: Docker Compose           │
│  📦 服务编排: 4 个容器                 │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Phase 5: 初始化 & 健康检查             │
│                                     │
│  ✅ 数据库连接正常                     │
│  ✅ Redis 连接正常                    │
│  ✅ 执行数据库迁移 (5 个表)            │
│  ✅ 创建默认管理员账户                 │
│  ✅ WAF 规则加载 (6 条)                │
│  ✅ 安全头配置生效                     │
│  ✅ API 健康检查通过                   │
│  ✅ 文档生成服务就绪                   │
│                                     │
│  🎉 部署完成!                        │
└─────────────────────────────────────┘
```

### 6.4 环境检测规则

```yaml
EnvironmentCheck:
  os:
    supported:
      - linux/amd64
      - linux/arm64
      - darwin/amd64
      - darwin/arm64 (Apple Silicon)
      - windows/amd64
    minimum:
      kernel: "4.0"                          # Linux 内核版本
      memory: 4GB
      disk: 20GB
    recommended:
      memory: 8GB
      disk: 50GB
      cpu_cores: 2
  docker:
    version: ">= 20.10"                      # Docker Engine
    compose_version: ">= 2.0"                # Docker Compose V2
    install_methods:
      linux:
        - apt_get: "apt-get install docker.io docker-compose-plugin"
        - yum: "yum install docker-ce docker-compose-plugin"
        - script: "https://get.docker.com"     # 官方安装脚本
      macos:
        - brew: "brew install docker colima"
        - manual: "Docker Desktop"
      windows:
        - winget: "winget install Docker.DockerDesktop"
        - manual: "Docker Desktop"
  ports:
    required:
      - 3000     # 应用服务
      - 5432     # PostgreSQL
      - 6379     # Redis
    optional:
      - 80/443   # Nginx 反向代理
      - 7700     # MeiliSearch
    conflict_resolution:
      prompt: true                           # 端口冲突时提示用户选择
      auto_remapping: true                    # 或自动映射到其他端口
  network:
    check_dns: true                         # 检测 DNS 解析
    check_outbound: true                     # 检测外网连通 (拉镜像)
    proxy_support: true                     # 自动检测系统代理配置
```

### 6.5 自动补齐机制

当检测到缺失依赖时，自动安装并记录操作日志：

```yaml
AutoProvision:
  docker:
    install: true                            # 未安装时自动安装
    start: true                              # 安装后自动启动
    enable: true                            # 设置开机自启
  database:
    provision: "container"                   # 默认使用容器化数据库
    init_script: "init.sql"                  # 自动执行初始化脚本
    migrations: true                         # 自动运行数据库迁移
    default_config:
      max_connections: 100
      shared_buffers: 256MB
      effective_cache_size: 1GB
  redis:
    provision: "container"
    config:
      maxmemory: 256mb
      policy: allkeys-lru
  security:
    generate_secrets: true                   # 自动生成所有密钥
    save_env_file: ".env"                     # 保存到 .env
    env_permissions: 600                       # 仅 owner 可读写
    backup_env: true                          # 备份到 ~/.admin-system/.env.bak
  ssl:
    self_signed: true                         # 默认自签名证书 (开发用)
    auto_letsencrypt: false                    # 提示用户后续配置
    domain_placeholder: "localhost"
```

### 6.6 部署后自动初始化

```yaml
PostDeployInit:
  database:
    run_migrations: true                     # 自动执行迁移
    seed_demo_data: true                       # 是否导入示例数据 (可选)
    seed_content:
      project: "demo"
      resources:
        - name: article
          count: 10
          title_pattern: "示例文章 #{{index}}"
  admin_account:
    auto_create: true                          # 自动创建管理员
    username: admin
    generate_password: true                   # 自动生成强密码
    display_on_completion: true               # 部署完成时显示
    force_change_on_login: true               # 首次登录强制修改密码
  services:
    health_check: true                         # 自动健康检查
    wait_for_ready: true                       # 等待所有服务就绪
    verify_endpoints:
      - path: /api/v1/health
        expected_status: 200
      - path: /api/v1/docs
        expected_status: 200
  firewall:
    auto_configure: true                      # 自动配置防火墙规则 (仅开放必要端口)
    ports:
      - 3000/tcp
      - 443/tcp (if ssl configured)
```

### 6.7 多种部署模式

部署器自动检测环境并选择最优模式：

| 模式 | 条件 | 说明 |
|------|------|------|
| **Docker Compose** (默认) | 检测到 Docker | 最简单，一条命令部署全部服务 |
| **裸机 Node.js** | 无 Docker，有 Node.js | 直接运行，适合轻量场景 |
| **Kubernetes** | 检测到 kubectl + 集群 | 生成 Helm Chart 并部署 |
| **开发模式** | 检测到 `--dev` 参数 | 启用热重载 + Mock 数据 + 调试工具 |

```bash
# 默认: 自动选择 Docker Compose
bash install.sh

# 指定模式
bash install.sh --mode=docker-compose
bash install.sh --mode=standalone         # 裸机 Node.js
bash install.sh --mode=kubernetes        # K8s Helm 部署
bash install.sh --mode=dev               # 开发模式

# 高级选项
bash install.sh --port=8080             # 自定义端口
bash install.sh --domain=api.example.com # 自动配置域名
bash install.sh --data-dir=/data/admin  # 自定义数据目录
bash install.sh --with-search           # 附带 MeiliSearch
bash install.sh --skip-demo              # 不导入示例数据
bash install.sh --offline               # 离线安装 (需提前下载包)
```

### 6.8 升级与回滚

```bash
# 一键升级 (自动备份 + 升级 + 健康检查 + 失败回滚)
admin-cli upgrade

# 升级流程:
# 1. 检测新版本
# 2. 自动备份当前数据
# 3. 拉取新版本镜像
# 4. 执行数据库迁移
# 5. 滚动更新 (零停机)
# 6. 健康检查
# 7. 失败则自动回滚到备份

# 回滚到指定版本
admin-cli rollback --version=1.2.0

# 查看部署状态
admin-cli status

# 查看版本信息
admin-cli version
```

### 6.9 卸载

```bash
# 完全卸载 (交互式确认)
admin-cli uninstall

# 卸载流程:
# 1. 确认提示 (二次确认)
# 2. 询问是否保留数据
# 3. 停止所有服务
# 4. 删除容器/镜像
# 5. 清理配置文件
# 6. 输出数据备份路径 (如果选择保留)
```

### 6.10 部署检查清单 (自动化)

部署器自动执行以下检查，无需人工逐项核对：

| 检查项 | 自动执行 | 说明 |
|--------|---------|------|
| 环境依赖检测 | ✅ | OS、内存、磁盘、Docker 等自动检测 |
| 依赖自动安装 | ✅ | 缺失组件自动补齐 |
| 密钥安全生成 | ✅ | 所有密钥自动生成，不使用默认值 |
| 数据库初始化 | ✅ | 自动迁移、建表、索引 |
| 防火墙配置 | ✅ | 仅开放必要端口 |
| HTTPS 证书 | ✅ | 默认自签名，支持自动 Let's Encrypt |
| 服务健康检查 | ✅ | 端到端验证所有端点 |
| 示例数据导入 | ✅ | 可选，一键体验系统功能 |
| 管理员账户创建 | ✅ | 自动生成强密码，首次登录强制修改 |
| 日志持久化 | ✅ | 自动配置日志输出路径 |

## 6.3 项目导出与备份

### 6.3.1 导出体系总览

系统支持三个层级的导出，满足不同场景：

| 层级 | 导出内容 | 用途 | 格式 |
|------|---------|------|------|
| **项目全量导出** | 配置 + 数据 + 文件 + 联动规则 | 项目迁移 / 灾备 | `.project.tar.gz` |
| **配置导出** | Schema + 接口定义 + 权限 + Hook + 联动规则 | 配置同步 / 版本管理 | JSON / YAML |
| **API 配置导出** | 资源 Schema + 自定义接口 + Hook 定义 | 接口配置迁移 / CI 集成 | JSON / YAML / OpenAPI |

### 6.3.2 项目全量导出

将项目所有内容打包为可移植归档，用于跨环境迁移或灾备恢复。

```yaml
# 导出包结构
project_blog_20260601.tar.gz
├── manifest.json              # 元信息: 版本、时间、校验和
├── project.json               # 项目配置
├── schemas/                   # 资源 Schema 定义
│   ├── article.json
│   ├── tag.json
│   └── comment.json
├── endpoints/                 # 自定义接口定义
│   └── publish.json
├── hooks/                     # Hook 脚本
│   └── validate_slug.js
├── link_rules/                # 联动规则
│   └── blog_to_shop.json
├── permissions/               # 权限配置
│   └── roles.json
├── data/                      # 业务数据
│   ├── article.csv            # 大表用 CSV (流式,省空间)
│   ├── tag.jsonl              # 小表用 JSONL
│   └── article_tag.jsonl
├── files/                     # 上传文件
│   └── uploads/...
├── doc_versions/              # 文档版本快照
│   └── v1.2.0.json
└── audit/                     # 审计日志 (可选)
    └── audit_2026.jsonl
```

**API 调用：**

```
# 触发导出 (异步任务)
POST /api/v1/_system/projects/{id}/export
Content-Type: application/json

{
  "scope": "full",                    // full | config | api_only
  "include": {
    "data": true,                     // 含业务数据
    "files": true,                    // 含上传文件
    "audit": false,                   // 含审计日志
    "versions": true                  // 含内容版本历史
  },
  "data_format": "auto",              // auto | csv | jsonl | sql
  "data_filters": {                   // 数据筛选 (可选)
    "resources": ["article", "tag"],  // 只导出指定资源
    "since": "2026-01-01",            // 只导出此时间之后的数据
    "status": ["published"]           # 按字段过滤
  },
  "encryption": {
    "enabled": true,
    "algorithm": "aes-256-gcm",
    "public_key": "-----BEGIN..."      // RSA 公钥加密对称密钥
  },
  "callback_url": "https://..."       // 完成后回调 (可选)
}

# 响应
{
  "code": 0,
  "data": {
    "task_id": "task_01HXYZ...",
    "status": "processing",
    "estimated_size": "150MB",
    "poll_url": "/api/v1/_system/tasks/task_01HXYZ"
  }
}

# 查询进度
GET /api/v1/_system/tasks/{task_id}

# 下载导出包
GET /api/v1/_system/projects/{id}/export/{task_id}/download
```

### 6.3.3 配置导出 (不含数据)

仅导出项目配置，用于跨环境同步（开发→测试→生产）或配置版本管理。

```
# 导出项目配置
POST /api/v1/_system/projects/{id}/export
{
  "scope": "config",
  "include": {
    "schemas": true,
    "endpoints": true,
    "hooks": true,
    "link_rules": true,
    "permissions": true,
    "doc_versions": false
  },
  "format": "yaml"                   // json | yaml
}

# 配置导出包结构
project_blog_config_20260601.tar.gz
├── manifest.json
├── project.json
├── schemas/
├── endpoints/
├── hooks/
├── link_rules/
└── permissions/
```

**配置 diff & 合并：**

```
# 比较两份配置的差异
POST /api/v1/_system/config/diff
Content-Type: multipart/form-data
  file_a: config_v1.tar.gz
  file_b: config_v2.tar.gz

# 响应
{
  "code": 0,
  "data": {
    "added": [
      { "type": "schema", "name": "comment", "detail": "新增资源" }
    ],
    "removed": [],
    "modified": [
      {
        "type": "endpoint",
        "name": "publish",
        "changes": [
          { "path": "rate_limit.max", "old": 30, "new": 60 }
        ]
      }
    ]
  }
}
```

### 6.3.4 API 配置导出

精简导出，只含接口相关定义，适用于 API 配置迁移和 CI/CD 集成。

```
# 导出 API 配置
POST /api/v1/_system/projects/{id}/export
{
  "scope": "api_only",
  "format": "json"
}

# API 配置导出包结构
project_blog_api_20260601.tar.gz
├── manifest.json
├── schemas/                   # 资源 Schema
├── endpoints/                 # 自定义接口
└── hooks/                     # Hook 定义
```

**单独导出格式：**

```
# 直接获取 OpenAPI 规范 (已支持, 此处增强)
GET /{project}/docs/openapi.json?expand_schemas=true&include_hooks=true

# 获取资源 Schema 原始定义
GET /api/v1/{project}/schemas?format=json       # 所有资源
GET /api/v1/{project}/schemas/article?format=yaml  # 单个资源

# 获取自定义接口定义
GET /api/v1/{project}/endpoints?format=json
```

### 6.3.5 项目导入

导出包可完整导入到同版本或其他实例，支持冲突处理策略。

```
POST /api/v1/_system/projects/import
Content-Type: multipart/form-data
  file: project_blog_20260601.tar.gz
  json: {
    "project_id": "blog",            # 目标项目, 不填则创建新项目
    "conflict_strategy": "skip",      # skip | overwrite | merge | rename
    "scope": "full",                 # full | config | api_only
    "dry_run": true,                  # 试运行, 只报告不执行
    "data_import": {
      "on_duplicate": "skip",        # skip | update | error
      "id_mapping": "preserve"       # preserve | regenerate
    },
    "encryption": {
      "private_key": "-----BEGIN..."  # 解密密钥
    }
  }

# 响应 (dry_run=true)
{
  "code": 0,
  "data": {
    "summary": {
      "schemas": { "new": 3, "conflict": 0, "skip": 0 },
      "data": { "records": 1542, "duplicates": 12 },
      "files": { "count": 87, "size": "23MB" }
    },
    "conflicts": [],
    "warnings": [
      "12 records with duplicate IDs found, will skip (on_duplicate=skip)"
    ]
  }
}
```

**导入冲突策略详解：**

| 策略 | Schema 冲突 | 数据冲突 | 适用场景 |
|------|-----------|---------|----------|
| `skip` | 跳过，保留现有 | 跳过重复 ID | 增量导入，不破坏已有 |
| `overwrite` | 覆盖现有定义 | 替换重复记录 | 全量同步，源为准 |
| `merge` | 字段级合并 | 更新非空字段 | 双向同步，合并差异 |
| `rename` | 重命名为新资源 | 重新生成 ID | 旁路导入，完全并行 |

### 6.3.6 自动备份

```yaml
BackupConfig:
  enabled: true
  schedule: "0 2 * * *"              # 每天凌晨 2 点
  retention:
    daily: 7                          # 保留 7 天日备份
    weekly: 4                         # 保留 4 周周备份
    monthly: 6                        # 保留 6 月月备份
  scope: full                         # full | config
  encryption:
    enabled: true
    algorithm: aes-256-gcm
  storage:
    type: s3                           # local | s3 | oss
    path: "s3://backups/admin-system/"
  notification:
    on_success: false                 # 成功不通知
    on_failure: true                  # 失败告警
    channel: webhook
    url: "https://hooks.example.com/backup"
  projects:                           # 按项目定制
    blog:
      scope: full
      schedule: "0 3 * * *"
    shop:
      scope: config                   # 只备份配置
      schedule: "0 4 * * 0"            # 每周日
```

**备份恢复：**

```
# 列出可用备份
GET /api/v1/_system/backups?project=blog

# 从备份恢复
POST /api/v1/_system/backups/{backup_id}/restore
{
  "scope": "full",                   # full | config | data_only
  "point_in_time": "2026-05-31T12:00:00Z",  # 时间点恢复 (需 WAL)
  "dry_run": true
}
```

### 6.3.7 CI/CD 集成

配置导出支持命令行操作，便于集成到 GitOps 工作流：

```bash
# CLI 导出 API 配置
admin-cli export --project=blog --scope=api_only --format=yaml -o ./config/

# CLI 导入 (部署流程)
admin-cli import --project=blog --file=./config/ --conflict=overwrite --dry-run=false

# 验证配置
admin-cli validate --project=blog --file=./config/

# 生成迁移计划
admin-cli migrate-plan --from=./config_v1/ --to=./config_v2/
```

---

## 7. 开发里程碑

| 阶段 | 内容 | 周期 |
|------|------|------|
| **P0** | 项目管理 + Schema Engine + 自动 CRUD + 基础 UI | 4 周 |
| **P1** | 自定义接口 + API 文档自动生成 + 鉴权体系 | 3 周 |
| **P2** | 项目联动 + Hook 系统 + 批量操作 | 3 周 |
| **P3** | 版本控制 + 审计日志 + 导入导出 + 自动备份 + CI/CLI 集成 | 3 周 |
| **P4** | SDK 生成 + Mock 服务 + 性能优化 | 2 周 |

---

## 8. 安全防护体系

### 8.1 安全架构总览

系统采用**纵深防御 (Defense in Depth)** 策略，从网络边界到数据层构建多层安全屏障：

```
┌───────────────────────────────────────────────────┐
│  第1层: 网络与传输安全                               │
│  WAF · TLS · DDoS 防护 · IP 白名单                  │
├───────────────────────────────────────────────────┤
│  第2层: 身份认证与访问控制                           │
│  JWT · API Key · OAuth 2.0 · RBAC · ABAC           │
├───────────────────────────────────────────────────┤
│  第3层: 应用安全                                    │
│  输入校验 · CSRF 防护 · 速率限制 · 安全头            │
├───────────────────────────────────────────────────┤
│  第4层: 数据安全                                    │
│  加密存储 · 字段级脱敏 · 数据隔离 · 审计追踪          │
├───────────────────────────────────────────────────┤
│  第5层: 运维安全                                    │
│  日志监控 · 入侵检测 · 安全扫描 · 应急响应            │
└───────────────────────────────────────────────────┘
```

### 8.2 网络与传输安全

#### 8.2.1 TLS 强制

```yaml
TLSConfig:
  min_version: TLSv1.3                     # 强制 TLS 1.3
  cipher_suites:                            # 仅允许 AEAD 套件
    - TLS_AES_256_GCM_SHA384
    - TLS_CHACHA20_POLY1305_SHA256
  hsts:
    enabled: true
    max_age: 31536000                      # 1 年
    include_subdomains: true
    preload: true                           # HSTS Preload List
  cert:
    auto_renew: true                       # 自动续签 (ACME/Let's Encrypt)
    renewal_before: 30d                    # 到期前 30 天
```

#### 8.2.2 WAF (Web Application Firewall)

内置轻量 WAF 规则引擎，防护常见攻击：

```yaml
WAFConfig:
  enabled: true
  mode: blocking                          # blocking | detection | learning
  rules:
    - id: WAF-001
      name: SQL 注入防护
      patterns: ['union select', 'or 1=1', 'drop table', '--']
      action: block
      log: true
    - id: WAF-002
      name: XSS 防护
      patterns: ['<script', 'javascript:', 'onerror=', 'onload=']
      action: sanitize                       # 转义而非阻断
    - id: WAF-003
      name: 路径穿越防护
      patterns: ['../', '..\\', '/etc/passwd', '/proc/']
      action: block
    - id: WAF-004
      name: 命令注入防护
      patterns: ['|', ';', '&', '$(', '`', '&&', '||']
      apply_to: [query_params, body]         # 仅对参数和请求体生效
      action: block
    - id: WAF-005
      name: XXE 防护
      patterns: ['<!DOCTYPE', '<!ENTITY', 'SYSTEM']
      apply_to: [xml_body]
      action: block
    - id: WAF-006
      name: SSRF 防护
      block_internal: true                   # 禁止访问内网地址
      allowed_protocols: ['http', 'https']
      blocked_cidrs:                        # 禁止的内网网段
        - '10.0.0.0/8'
        - '172.16.0.0/12'
        - '192.168.0.0/16'
        - '127.0.0.0/8'
        - '169.254.169.254/32'               # 云元数据
  custom_rules: []                          # 管理后台可自定义规则
  rate_limit_by_ip:                         # IP 级 WAF 限流
    window: 60s
    max: 300
    block_duration: 300s                     # 超限封锁 5 分钟
```

#### 8.2.3 DDoS 防护

```yaml
DDoSProtection:
  enabled: true
  strategy: auto                            # auto | aggressive | relaxed
  thresholds:
    qps: 10000                              # 单 IP QPS 阈值
    concurrent: 100                         # 单 IP 并发连接阈值
    bandwidth: 100MB                        # 单 IP 带宽阈值
  actions:
    warn:                                    # 阶段一: 告警 + 验证
      captcha: true                         # 弹出验证码
      slow_down: 500ms                       # 响应降速
    mitigate:                                # 阶段二: 限制
      rate_limit: 10/s                      # 降至 10 QPS
      block_duration: 60s
    emergency:                               # 阶段三: 封禁
      block: true
      block_duration: 3600s
      alert: true                            # 触发告警通知
  # 建议生产环境配合云厂商 DDoS 防护 (如 AWS Shield / 阿里云 DDoS 高防)
  upstream_protection: true                  # CDN/云防护层
```

#### 8.2.4 IP 访问控制

```yaml
IPAccessControl:
  admin_panel:
    whitelist: ['10.0.0.0/8', '172.16.0.0/12']  # 管理后台仅内网
    whitelist_enabled: true
  api:
    blacklist: []                            # 动态黑名单, 由 WAF 自动填充
    whitelist: []                            # 按需设置 IP 白名单
    geo_block:
      enabled: false                         # 按需开启地理封锁
      blocked: []                             # ISO 3166-1 国家码
  sensitive_endpoints:
    paths: ['/api/v1/_system/users', '/api/v1/_system/backup']
    require_whitelist: true
    enforce_mfa: true                         # 必须多因素认证
```

### 8.3 身份认证安全

#### 8.3.1 JWT 安全策略

```yaml
JWTConfig:
  access_token:
    algorithm: RS256                          # 非对称签名, 私钥签发
    expiry: 15m                              # Access Token 15 分钟
  refresh_token:
    expiry: 7d                               # Refresh Token 7 天
    rotation: true                           # 每次使用自动轮换
    reuse_grace: 30s                          # 旧 Token 宽限期 (防并发问题)
  storage:
    access: http_only_cookie                  # Access Token 存 HttpOnly Cookie
    refresh: http_only_cookie + db              # Refresh Token 同时持久化
    same_site: strict                         # 防止 CSRF
    secure: true                              # 仅 HTTPS
    path: /api/
  revocation:
    enabled: true                            # 支持 Token 撤销
    blacklist_ttl: 15m                        # 黑名单 TTL = Access Token 有效期
    store: redis                              # Redis 存储黑名单
  key_rotation:
    schedule: "0 0 * * 0"                   # 每周轮换密钥对
    overlap: 24h                             # 新旧密钥重叠期, 支持平滑过渡
    auto_generate: true
  device_binding:
    enabled: true                            # Token 绑定设备指纹
    fingerprint: [user_agent, ip_range]      # 指纹要素
    alert_on_change: true                     # 设备变化时告警
```

#### 8.3.2 API Key 安全

```yaml
APIKeyConfig:
  generation:
    algorithm: random
    length: 48
    prefix: ask_                             # 标识用途: ask_admin_system
    encoding: base62                         # URL 安全
  storage:
    hash_algorithm: sha256                    # 数据库只存哈希, 不存原文
    pepper: ${API_KEY_PEPPER}               # 加盐, 防彩虹表
  lifecycle:
    auto_expire: true
    max_age: 90d                              # 强制 90 天过期
    expiry_warning: 14d                      # 过期前 14 天通知
  usage:
    allowed_ips: []                          # 绑定 IP (可选)
    allowed_resources: []                    # 绑定资源范围 (可选)
    rate_limit: 1000/min                     # API Key 级别限流
    audit: true                              # 记录所有调用日志
  rotation:
    on_compromise: immediate                  # 泄露时立即撤销
    planned_rotation: 30d                     # 建议定期轮换
```

#### 8.3.3 多因素认证 (MFA)

```yaml
MFAConfig:
  enabled: true
  methods:
    - type: totp                             # 时间型 OTP (Google Authenticator 等)
      issuer: AdminSystem
      digits: 6
      period: 30s
    - type: sms                               # 短信验证码
      provider: sms_gateway
      code_length: 6
      expiry: 5m
      cooldown: 60s                           # 重发冷却
      max_attempts: 5                         # 每小时最大尝试次数
    - type: email                              # 邮箱验证码
      code_length: 6
      expiry: 10m
  enforcement:
    require_on_roles: [admin, editor]         # 管理角色强制 MFA
    require_on_new_device: true                # 新设备登录强制 MFA
    require_on_ip_change: true                # IP 变化强制 MFA
    require_on_sensitive_ops: true             # 敏感操作二次验证
  recovery:
    backup_codes:
      count: 10                               # 10 个恢复码
      single_use: true                         # 使用一次即失效
```

#### 8.3.4 登录安全

```yaml
LoginSecurity:
  password:
    min_length: 12
    require_uppercase: true
    require_lowercase: true
    require_digit: true
    require_special: true                      # 至少一个特殊字符
    max_length: 128
    check_breached_db: true                    # 校验 HIBP 密码泄露库
    hash_algorithm: argon2id                  # Argon2id (抗 GPU/ASIC)
    argon2:
      memory: 65536                          # 64 MB
      iterations: 3
      parallelism: 4
      salt_length: 32
  account_lockout:
    max_attempts: 5                           # 连续失败次数
    lockout_duration: 30m                      # 锁定 30 分钟
    progressive: true                         # 渐进式锁定: 5次30分, 10次1h, 15次永久
    auto_unlock: false                         # 不自动解锁, 需管理员/邮件
  session:
    max_concurrent: 5                         # 单用户最大并发会话
    on_exceed: terminate_oldest               # 超限时踢掉最旧的
    idle_timeout: 60m                         # 空闲超时
    absolute_timeout: 24h                     # 绝对超时
    track_sessions: true                      # 会话列表可查看/可终止
  suspicious_activity:
    monitor:
      - login_from_new_device
      - login_from_new_location
      - rapid_failed_attempts
      - impossible_travel                      # 不可能旅行检测
    actions:
      alert: true
      require_mfa: true
      block: false                             # 默认不阻断, 仅告警 + MFA
```

### 8.4 应用安全

#### 8.4.1 输入校验

```yaml
InputValidation:
  engine: schema_based                       # 基于 Schema Engine 自动校验
  layers:
    - name: 类型校验
      enabled: true
      description: Schema 字段类型严格匹配
    - name: 长度校验
      enabled: true
      description: string/bytes 长度限制
    - name: 必填校验
      enabled: true
      description: required 字段不可为空
    - name: 枚举校验
      enabled: true
      description: enum 字段值必须在定义范围内
    - name: 格式校验
      enabled: true
      patterns:
        email: '^[^@]+@[^@]+\\.[^@]+$'
        url: '^https?://'
        phone: '^\\+?\\d{7,15}$'
    - name: 自定义校验
      enabled: true
      description: 通过 Hook before_create/update 扩展
  request_limits:
    max_body_size: 10MB
    max_json_depth: 20                         # 防深度嵌套 DoS
    max_array_length: 1000
    max_query_params: 50
    max_header_size: 8KB
    allowed_content_types:
      - 'application/json'
      - 'multipart/form-data'
      - 'application/x-www-form-urlencoded'
```

#### 8.4.2 CSRF 防护

```yaml
CSRFGuard:
  enabled: true
  strategy: same_site_cookie                  # 优先 SameSite Cookie
  fallback:
    double_submit_cookie: true                  # 备用: 双重提交 Cookie
    token_header: X-CSRF-Token
    token_length: 32
    rotate_on_auth: true                         # 认证后轮换 Token
  exempt:
    - methods: [GET, HEAD, OPTIONS]
    - content_types: ['application/json']       # JSON API 免 CSRF (由 CORS 保护)
```

#### 8.4.3 CORS 配置

```yaml
CORSConfig:
  default_policy: deny                       # 默认拒绝跨域
  per_project: true                             # 每个项目独立配置
  # 示例: blog 项目的 CORS 配置
  project_blog:
    allowed_origins:
      - 'https://blog.example.com'
      - 'https://admin.example.com'
    allowed_methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    allowed_headers: ['Authorization', 'Content-Type', 'X-API-Key']
    exposed_headers: ['X-Total-Count', 'X-Request-Id']
    allow_credentials: true
    max_age: 86400
```

#### 8.4.4 安全响应头

```yaml
SecurityHeaders:
  Content-Security-Policy:
    value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: '0'                        # 已废弃, 依赖 CSP
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy:
    value: 'camera=(), microphone=(), geolocation=(), payment=()'
  Cache-Control: no-store, no-cache, must-revalidate    # API 响应不缓存
  X-Request-Id: auto                           # 唯一请求 ID, 便于追踪
```

#### 8.4.5 API 速率限制

```yaml
RateLimiting:
  strategy: sliding_window                   # 滑动窗口
  store: redis                               # 分布式限流
  default_limits:
    authenticated:
      per_user: 300/min                        # 每用户
      per_ip: 500/min                          # 每 IP
    anonymous:
      per_ip: 100/min                          # 未认证限流更严
  endpoint_overrides:                         # 敏感接口额外限制
    '/api/v1/_system/auth/login': 5/min       # 登录
    '/api/v1/_system/auth/register': 3/hour   # 注册
    '/api/v1/*/export': 1/hour                  # 导出
    '/api/v1/*/import': 2/hour                  # 导入
  throttling:
    enabled: true
    strategy: token_bucket                    # 令牌桶算法
    burst: 10                                  # 突发允许
    sustained: 30/min                         # 持续速率
  response_headers: true                      # 返回限流信息头
  #  X-RateLimit-Limit: 300
  #  X-RateLimit-Remaining: 287
  #  X-RateLimit-Reset: 1717200000
```

### 8.5 数据安全

#### 8.5.1 加密存储

```yaml
Encryption:
  at_rest:
    database:
      enabled: true
      method: pgcrypto                       # PostgreSQL 原生加密扩展
      columns: []                             # 默认不加密, 按需标记敏感字段
      key_management: vault                   # 密钥管理
    sensitive_fields:                        # 自动识别并加密
      patterns:
        - field_name: ['password', 'secret', 'token', 'key', 'credential']
        - field_type: [string]
        - min_length: 6
      action: encrypt_with_aes256
  in_transit:
    internal: tls                             # 服务间通信加密
    database: ssl                            # 数据库连接 SSL
    redis: tls                               # Redis 连接 TLS
  key_management:
    provider: hashicorp_vault                # 推荐 / AWS KMS / 阿里云 KMS 备选
    key_rotation: 90d                         # 数据加密密钥 90 天轮换
    envelope_encryption: true                  # 信封加密: 数据密钥加密 + 主密钥保护
```

#### 8.5.2 字段级脱敏

对敏感数据展示时自动脱敏，防止泄露：

```yaml
DataMasking:
  enabled: true
  rules:
    - field_pattern: 'email'
      mask_type: partial                      # 部分遮盖
      mask: 'u***@d***'
      expose_to_roles: [admin]                # 仅 admin 可见原文
    - field_pattern: 'phone|mobile'
      mask_type: partial
      mask: '138****5678'
      expose_to_roles: [admin]
    - field_pattern: 'password|secret|token|key'
      mask_type: full                         # 完全遮盖
      mask: '******'
      expose_to_roles: []                    # 任何人不可见
    - field_pattern: 'id_card|ssn'
      mask_type: partial
      mask: '110***********1234'
      expose_to_roles: [admin]
    - field_pattern: 'bank_account|credit_card'
      mask_type: partial
      mask: '**** **** **** 5678'
      expose_to_roles: [admin]
  api_response: true                         # API 响应自动脱敏
  audit_log: true                             # 审计日志中同时脱敏
  export_masking: true                        # 导出时也脱敏 (除非管理员显式授权)
```

#### 8.5.3 文件上传安全

```yaml
FileUploadSecurity:
  max_size: 50MB                              # 单文件上限
  max_total_size: 500MB                       # 单次请求总大小
  allowed_mime_types:                        # 白名单
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    document: ['application/pdf', 'application/msword', 'text/csv']
    archive: ['application/zip', 'application/gzip']
  blocked_extensions:                        # 黑名单 (双重防护)
    - exe, bat, cmd, sh, ps1, msi
    - js, vbs, vba, macro
    - html, htm                                # 防存储型 XSS
  scanning:
    antivirus:
      enabled: true
      engine: clamav                          # ClamAV 开源杀毒
      scan_async: true                        # 异步扫描, 不阻塞上传
      on_detect: quarantine                    # 隔离而非删除
    magic_byte_check: true                     # 校验文件真实类型 (非仅扩展名)
    svg_sanitizer: true                        # SVG 文件净化 (移除 JS/外部引用)
  storage:
    path_traversal_check: true                 # 路径穿越检查
    random_filename: true                      # 随机文件名, 无法猜测
    separate_bucket: true                      # 上传文件单独存储桶
  metadata:
    strip_exif: true                           # 移除 EXIF 信息 (防隐私泄露)
    strip_metadata: true
```

#### 8.5.4 数据隔离审计

```yaml
DataIsolationAudit:
  enabled: true
  checks:
    - name: 跨项目访问检测
      description: 检测任何未授权的跨项目数据访问
      severity: critical
      action: alert + block
    - name: Schema 隔离验证
      description: 定期验证项目 Schema 间无越权查询
      schedule: "0 */6 * * *"                   # 每 6 小时
    - name: API Key 项目绑定校验
      description: 验证 API Key 只能访问绑定项目
      severity: high
  query_guard:
    enabled: true                             # 数据库查询层防护
    ensure_schema_prefix: true                  # 强制 SQL 带 Schema 前缀
    block_cross_schema: true                  # 禁止跨 Schema 查询
    log_all_queries: false                     # 仅记录可疑查询
```

### 8.6 审计与监控

#### 8.6.1 安全审计日志

```yaml
SecurityAuditLog:
  enabled: true
  events:
    authentication:
      - login_success
      - login_failure
      - login_blocked
      - token_refresh
      - token_revoke
      - mfa_enabled
      - mfa_challenge
      - mfa_recovery_used
      - device_registered
      - session_terminated
    authorization:
      - permission_denied
      - role_changed
      - api_key_created
      - api_key_revoked
    data_access:
      - sensitive_data_read                  # 敏感字段读取
      - bulk_export_started                    # 批量导出
      - bulk_import_started                    # 批量导入
      - backup_restored                        # 备份恢复 (高危操作)
    system:
      - schema_modified                       # Schema 变更
      - endpoint_modified                     # 接口变更
      - config_changed                        # 系统配置变更
      - waf_triggered                          # WAF 触发
      - rate_limit_exceeded                    # 限流触发
  output:
    storage: postgresql                       # 主存储
    sync_to:                                   # 实时同步
      - elasticsearch                          # 可选: 搜索分析
      - syslog                                 # 可选: 集中式日志
    retention: 365d                           # 保留 1 年
    integrity:                                # 日志防篡改
      append_only: true                       # 不可修改, 仅追加
      checksum: sha256                        # 增量校验
  compliance:                                # 合规标签
    - SOC2
    - ISO27001
    - GDPR                                    # 记录个人数据访问
```

#### 8.6.2 实时安全监控

```yaml
SecurityMonitoring:
  alerts:
    # 认证异常
    - id: SEC-001
      name: 暴力破解检测
      condition: "5 login failures from same IP in 10 min"
      severity: high
      action: [alert, temp_block_ip_30m]
    - id: SEC-002
      name: 账户接管风险
      condition: "login from new device + new geo after password change"
      severity: critical
      action: [alert, require_mfa, lock_account]
    - id: SEC-003
      name: 异常 API 调用量
      condition: "API calls > 3x user's daily average"
      severity: medium
      action: alert
    - id: SEC-004
      name: 权限提升检测
      condition: "role change to admin outside business hours"
      severity: critical
      action: [alert, require_approval]
    # 数据异常
    - id: SEC-005
      name: 大规模数据外泄
      condition: "bulk export > 10000 records in 1 hour"
      severity: critical
      action: [alert, pause_export, require_approval]
    - id: SEC-006
      name: 敏感数据异常访问
      condition: "sensitive_field_read > 50 times by non-admin in 1 hour"
      severity: high
      action: alert
    # 系统异常
    - id: SEC-007
      name: WAF 大量触发
      condition: "WAF block > 100 times from same IP in 5 min"
      severity: high
      action: [alert, block_ip_1h]
    - id: SEC-008
      name: 异常请求模式
      condition: "request size > avg * 5 or depth > avg * 3"
      severity: medium
      action: alert
  notification_channels:
    - webhook
    - email
    - sms                                     # 紧急告警
    - im                                      # IM 机器人 (企业微信/钉钉/飞书)
  dashboard:
    security_overview: true                    # 安全态势总览
    real_time_alerts: true                     # 实时告警流
    threat_map: true                          # 攻击来源地理分布
```

#### 8.6.3 安全扫描

```yaml
SecurityScanning:
  sast:                                      # 静态代码扫描
    enabled: true
    tool: semgrep                             # 可选: SonarQube
    schedule: "on_commit"
    severity_threshold: medium
  dependency_scan:                           # 依赖漏洞扫描
    enabled: true
    tool: trivy                               # 可选: Snyk, Dependabot
    schedule: daily
    auto_block_critical: true                  # 严重漏洞自动阻断部署
    notify_on_high: true
  dast:                                      # 动态安全测试
    enabled: true
    tool: owasp_zap                           # API 安全扫描
    schedule: weekly
    scope:                                    # 扫描范围
      - authentication_endpoints
      - crud_endpoints
      - admin_endpoints
  secret_detection:                          # 密钥泄露检测
    enabled: true
    scan_targets:
      - git_history                           # Git 历史记录
      - config_files                          # 配置文件
      - environment_variables                  # 环境变量
    patterns:                                 # 检测模式
      - AWS Access Key
      - RSA Private Key
      - JWT Secret
      - Database Password
      - API Key
```

### 8.7 应急响应

#### 8.7.1 应急预案

```yaml
IncidentResponse:
  severity_levels:
    P0_critical:                              # 数据泄露 / 系统被入侵
      response_time: 5min
      notification: [cto, security_team, oncall]
      actions:
        - 自动封锁可疑 IP
        - 强制所有会话过期
        - 启用只读模式
        - 保留完整日志快照
    P1_high:                                  # 暴力破解 / WAF 大量触发
      response_time: 30min
      notification: [security_team, oncall]
      actions:
        - 封锁攻击 IP
        - 受影响账户强制 MFA
        - 增强限流策略
    P2_medium:                                # 异常访问模式
      response_time: 2h
      notification: [security_team]
      actions:
        - 告警通知
        - 调查分析
    P3_low:                                   # 低风险告警
      response_time: 24h
      notification: [slack_channel]
      actions:
        - 记录追踪
  emergency_actions:                        # 一键应急操作
    lockdown:
      description: 全系统紧急封锁
      effects:
        - 所有 API 返回 503
        - 所有新会话被拒绝
        - 仅管理员可访问
      rollback: manual                        # 手动解除, 防误触
    force_logout_all:
      description: 强制所有用户登出
      effects:
        - 清空所有 Token 黑名单
        - 所有 Refresh Token 作废
    rotate_all_secrets:
      description: 轮换所有密钥和 Token
      effects:
        - 生成新的 JWT 密钥对
        - 撤销所有 API Key
        - 轮换数据库密码
        - 轮换加密密钥
```

#### 8.7.2 安全事件报告

```sql
-- 安全事件表
CREATE TABLE public.security_events (
  id            ULID PRIMARY KEY DEFAULT gen_ulid(),
  severity      VARCHAR(8) NOT NULL,                    -- P0/P1/P2/P3
  category       VARCHAR(32) NOT NULL,                  -- authentication/data/system
  type           VARCHAR(64) NOT NULL,                   -- login_failure/data_leak/...
  description    TEXT NOT NULL,
  source_ip      INET,
  user_id        ULID,
  project_id     ULID,
  request_id     VARCHAR(64),                           -- 关联请求 ID
  raw_event      JSONB,                                  # 原始事件数据
  status         VARCHAR(16) DEFAULT 'open',            -- open/investigating/resolved/closed
  assigned_to    VARCHAR(128),
  resolution     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at    TIMESTAMPTZ
);
CREATE INDEX idx_security_severity ON public.security_events(severity, created_at DESC);
CREATE INDEX idx_security_category ON public.security_events(category, created_at DESC);
```

### 8.8 安全基线检查清单

部署前必须通过的安全检查项：

#### 传输层
- [ ] TLS 1.3 启用，弱密码套件禁用
- [ ] HSTS 启用且 preload
- [ ] 证书自动续签配置

#### 认证层
- [ ] 密码策略: ≥12 位，含大小写数字特殊字符
- [ ] Argon2id 密码哈希，参数符合推荐值
- [ ] 登录失败锁定策略生效
- [ ] MFA 对管理员角色强制启用
- [ ] JWT 使用 RS256 + HttpOnly Cookie
- [ ] API Key 数据库仅存哈希

#### 应用层
- [ ] WAF 规则启用且处于 blocking 模式
- [ ] 输入校验基于 Schema，无 SQL 注入风险
- [ ] CSRF 防护启用
- [ ] CORS 按项目最小化配置
- [ ] 安全响应头全部配置
- [ ] 速率限制按端点生效

#### 数据层
- [ ] 敏感字段加密存储
- [ ] 数据展示自动脱敏
- [ ] 文件上传白名单 + 病毒扫描
- [ ] 项目数据隔离验证通过

#### 运维层
- [ ] 安全审计日志启用且不可篡改
- [ ] 实时安全监控告警配置
- [ ] 依赖漏洞扫描集成到 CI
- [ ] 应急预案已制定并演练
- [ ] 管理后台 IP 白名单生效

---

## 9. 测试数据填充

### 9.1 数据填充脚本

系统提供测试数据填充脚本，用于初始化项目数据，支持丰富的数据类型：

```bash
# 运行数据填充脚本
node scripts/seed-test-data.js

# 可选参数
node scripts/seed-test-data.js --project=blog    # 仅填充指定项目
node scripts/seed-test-data.js --reset           # 重置并重新填充
node scripts/seed-test-data.js --count=10       # 每个资源填充10条数据
```

### 9.2 预置项目与数据

系统预置5个示例项目，每个项目包含独立数据库和测试数据：

| 项目标识 | 项目名称 | 资源类型 | 数据数量 | 数据库文件 |
|---------|---------|---------|---------|-----------|
| `personal-homepage` | 个人主页 | profile | 5条 | `./databases/personal-homepage.sqlite` |
| `portfolio` | 作品集 | works | 5条 | `./databases/portfolio.sqlite` |
| `blog-system` | 博客系统 | articles | 5条 | `./databases/blog-system.sqlite` |
| `ecommerce` | 电商平台 | products | 5条 | `./databases/ecommerce.sqlite` |
| `task-manager` | 任务管理 | tasks | 5条 | `./databases/task-manager.sqlite` |

### 9.3 数据类型覆盖

测试数据覆盖以下字段类型：

| 数据类型 | 示例字段 | 示例值 |
|---------|---------|--------|
| string | name, title | "张三", "React 18 新特性" |
| integer | age, views | 25, 1500 |
| decimal | price, discount | 99.99, 0.85 |
| boolean | active, is_hot | true, false |
| enum | status, priority | "published", "high" |
| timestamp | created_at, deadline | "2024-01-15T10:30:00Z" |
| date | birthday | "1999-01-15" |
| array | skills, tags | ["React", "Vue"], ["技术", "前端"] |
| json | social_links | {"github": "...", "twitter": "..."} |
| email | email | "zhangsan@example.com" |
| phone | phone | "13800138000" |

### 9.4 数据示例

**个人主页 - profile:**
```json
{
  "name": "张三",
  "age": 28,
  "email": "zhangsan@example.com",
  "phone": "13800138001",
  "bio": "前端开发工程师，热爱技术",
  "role": "frontend",
  "is_active": true,
  "skills": ["React", "Vue", "TypeScript"],
  "social_links": {"github": "https://github.com/zhangsan"},
  "birthday": "1996-03-15",
  "created_at": "2024-01-10T08:00:00Z"
}
```

**博客系统 - articles:**
```json
{
  "title": "React 18 新特性详解",
  "content": "React 18 引入了并发特性...",
  "author": "李四",
  "status": "published",
  "is_featured": true,
  "views": 2350,
  "tags": ["React", "前端", "技术"],
  "published_at": "2024-01-15T14:30:00Z"
}
```

**电商平台 - products:**
```json
{
  "name": "无线蓝牙耳机",
  "price": 299.99,
  "discount": 0.8,
  "is_hot": true,
  "rating": 4.8,
  "stock": 150,
  "category": "电子产品",
  "description": "高品质音效，超长续航"
}
```

---

> **文档维护说明:** 本文档随系统迭代同步更新，接口变更自动反映在 API 文档中心。
