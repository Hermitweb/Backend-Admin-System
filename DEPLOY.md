# Backend Admin System 部署配置

## 文件说明

### Docker 部署
- `Dockerfile` - 多阶段构建镜像文件
- `docker-compose.yml` - Docker Compose 编排配置

### Windows Server 部署
- `deploy/windows/deploy.ps1` - PowerShell 部署脚本
- `deploy/windows/web.config` - IIS 配置文件

### Linux 部署
- `deploy/linux/deploy.sh` - Bash 部署脚本
- `deploy/nginx/nginx.conf` - Nginx 配置

### macOS 部署
- `deploy/macos/deploy.sh` - Bash 部署脚本
- `ecosystem.config.js` - PM2 进程管理配置

### 环境配置
- `.env.production` - 生产环境变量模板

## 快速部署

### 1. Docker (最推荐)
```bash
docker compose up -d --build
```

### 2. Linux (Ubuntu/CentOS)
```bash
sudo ./deploy/linux/deploy.sh install
```

### 3. macOS
```bash
./deploy/macos/deploy.sh install
```

### 4. Windows Server
```powershell
./deploy/windows/deploy.ps1 -Action deploy
```

## 详细文档

请参阅 `deploy/README.md` 获取完整的部署说明。
