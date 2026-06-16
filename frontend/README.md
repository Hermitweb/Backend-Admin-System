# Backend Admin System - 前端

基于 React + TypeScript + Vite 的现代化前端管理界面。

## 技术栈

- **React 19**: 用户界面框架
- **TypeScript 5**: 类型安全
- **Vite 6**: 构建工具
- **Tailwind CSS 4**: 样式框架
- **React Router 7**: 路由管理
- **Zustand 4**: 状态管理
- **Axios**: HTTP 客户端
- **Lucide React**: 图标库

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 预览
npm run preview

# 代码检查
npm run lint
```

## 页面路由

| 路径 | 页面 |
|------|------|
| `/dashboard` | 控制台 |
| `/projects` | 项目管理 |
| `/users` | 用户管理 |
| `/schemas` | Schema管理 |
| `/data` | 数据管理 |
| `/database` | 数据库管理 |
| `/links` | 联动规则 |
| `/docs` | API文档 |
| `/settings` | 系统设置 |

## 配置

API 地址在 `vite.config.ts` 中配置：

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
```

## 构建产物

```
frontend/dist/
├── index.html
└── assets/
    ├── index.js
    └── index.css
```

## 环境变量

在 `.env` 文件中配置：

```
VITE_API_URL=http://localhost:3000
```
