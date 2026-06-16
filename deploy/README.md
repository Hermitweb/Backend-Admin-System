# Backend Admin System 部署指南

本项目支持在 Windows Server、Linux、macOS 和 Docker 环境下部署。

## 目录结构

```
deploy/
├── docker/           # Docker 部署配置
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── README.md
├── windows/          # Windows Server 部署
│   ├── deploy.ps1
│   └── web.config
├── linux/            # Linux 部署 (systemd + nginx)
│   └── deploy.sh
├── macos/            # macOS 部署 (launchd)
│   └── deploy.sh
├── nginx/            # Nginx 配置
│   └── nginx.conf
└── README.md         # 通用部署文档
```

## 快速开始

### 1. Docker 部署（推荐用于容器环境）

```bash
# 构建并启动所有服务
docker compose up -d --build

# 查看日志
docker compose logs -f

# 停止服务
docker compose down
```

访问地址: http://localhost

### 2. Windows Server 部署

#### 前提条件
- Windows Server 2016+
- Node.js 20.x 或更高版本
- IIS 10（可选，用于托管前端）
- NSSM（Windows 服务包装器）

#### 部署步骤

1. **以管理员身份打开 PowerShell**

2. **安装/更新 Node.js**
   ```powershell
   # 检查是否已安装
   node --version
   
   # 如果未安装，使用 winget 安装
   winget install OpenJS.NodeJS.LTS
   ```

3. **运行部署脚本**
   ```powershell
   cd D:\path\to\backend-admin\deploy\windows
   
   # 完整部署（构建 + 安装服务 + 配置 IIS + 启动）
   .\deploy.ps1 -Action deploy
   
   # 或者分步执行
   .\deploy.ps1 -Action build
   .\deploy.ps1 -Action install
   .\deploy.ps1 -Action configure-iis
   .\deploy.ps1 -Action start
   ```

4. **IIS 配置（可选）**
   - 添加 website，指向 `frontend/dist` 目录
   - 安装 URL Rewrite Module
   - 使用生成的 `web.config` 文件

#### 常用命令
```powershell
# 查看服务状态
Get-Service -Name "BackendAdmin"

# 停止服务
.\deploy.ps1 -Action stop

# 重启服务
.\deploy.ps1 -Action restart

# 更新部署
.\deploy.ps1 -Action update
```

### 3. Linux 部署

#### 前提条件
- Ubuntu 20.04+ / CentOS 8+ / RHEL 8+
- Node.js 20.x 或更高版本
- Nginx
- systemd

#### 部署步骤

```bash
# 切换到部署脚本目录
cd /opt/backend-admin/deploy/linux

# 安装并部署
sudo ./deploy.sh install

# 更新部署
sudo ./deploy.sh update /path/to/source

# 查看状态
sudo ./deploy.sh status

# 备份数据库
sudo ./deploy.sh backup
```

#### 配置 SSL
```bash
# 使用 Certbot (推荐)
sudo ./deploy.sh ssl your-domain.com

# 或手动配置
sudo ./deploy.sh ssl your-domain.com
```

#### 常用命令
```bash
# 启动/停止/重启
sudo ./deploy.sh start
sudo ./deploy.sh stop
sudo ./deploy.sh restart

# 查看日志
journalctl -u backend-admin -f

# 查看服务状态
systemctl status backend-admin
```

### 4. macOS 部署

#### 前提条件
- macOS 10.15+ (Catalina 或更高)
- Node.js 20.x 或更高版本
- Nginx（通过 Homebrew 安装）

#### 部署步骤

```bash
# 切换到部署脚本目录
cd /path/to/backend-admin/deploy/macos

# 安装并部署
./deploy.sh install

# 更新部署
./deploy.sh update /path/to/source

# 查看状态
./deploy.sh status

# 备份数据库
./deploy.sh backup
```

#### 常用命令
```bash
# 启动/停止/重启
./deploy.sh start
./deploy.sh stop
./deploy.sh restart

# 查看 launchd 服务
launchctl list com.backend.admin

# 查看日志
tail -f /opt/backend-admin/logs/
```

## 配置说明

### 环境变量

复制 `.env.production` 为 `.env` 并修改：

```bash
cp .env.production .env
# 编辑 .env 文件
```

关键配置项：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `NODE_ENV` | 运行环境 | production |
| `PORT` | 服务端口 | 3000 |
| `JWT_SECRET` | JWT 密钥（必须修改！） | - |
| `DB_PATH` | SQLite 数据库路径 | ./data/db.sqlite |
| `LOG_LEVEL` | 日志级别 | warn |
| `CORS_ORIGINS` | 允许的源 | http://localhost:3000 |

### 安全建议

1. **修改默认密码**
   - 首次登录后立即修改管理员密码
   - 使用强密码（至少 12 位，包含大小写字母、数字和特殊字符）

2. **配置防火墙**
   ```bash
   # Linux (ufw)
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   
   # Linux (firewalld)
   sudo firewall-cmd --permanent --add-service=http
   sudo firewall-cmd --permanent --add-service=https
   sudo firewall-cmd --reload
   
   # Windows PowerShell
   New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
   New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
   ```

3. **定期备份**
   ```bash
   # 手动备份
   ./deploy.sh backup
   
   # 设置定时备份（cron）
   crontab -e
   # 添加: 0 2 * * * /opt/backend-admin/deploy/linux/deploy.sh backup
   ```

4. **使用 HTTPS**
   - 生产环境务必配置 SSL 证书
   - 推荐使用 Let's Encrypt（免费）
   - 证书自动续期

## 故障排查

### 常见问题

#### 1. 端口被占用
```bash
# Linux
sudo lsof -i :3000
sudo kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /F /PID <PID>
```

#### 2. 数据库锁定
```bash
# 重启服务
# Linux
sudo systemctl restart backend-admin

# Windows
.\deploy.ps1 -Action restart

# macOS
./deploy.sh restart
```

#### 3. 权限问题
```bash
# Linux
sudo chown -R backend-admin:backend-admin /opt/backend-admin
sudo chmod 755 /opt/backend-admin
```

#### 4. 内存不足
```bash
# Docker - 增加内存限制
# docker-compose.yml 中添加:
# deploy:
#   resources:
#     limits:
#       memory: 1G
```

#### 5. Nginx 502 Bad Gateway
- 检查后端服务是否运行
- 检查端口配置是否匹配
- 检查 Nginx 配置中的 proxy_pass 地址

## 性能优化

### 1. Node.js 优化
```bash
# 使用 PM2（推荐用于多进程）
npm install -g pm2
pm2 start dist/main.js -i max
pm2 save
pm2 startup
```

### 2. Nginx 缓存
已在 nginx.conf 中配置静态资源缓存（1年）。

### 3. 数据库优化
- 定期运行 VACUUM 命令
- 为常用查询字段创建索引
- 使用 WAL 模式提高并发性能

## 监控

### 健康检查
```bash
curl http://localhost:3000/api/v1/dashboard/stats
```

### Docker 监控
```bash
docker stats
docker compose logs --tail=100
```

### 系统监控
```bash
# Linux
top
htop
netstat -tuln

# Windows
tasklist
netstat -ano

# macOS
top -o cpu
```

## 更新版本

### 步骤
1. 拉取最新代码
   ```bash
   git pull origin main
   ```

2. 运行部署脚本
   ```bash
   # Linux
   sudo ./deploy.sh update /path/to/project
   
   # macOS
   ./deploy.sh update /path/to/project
   
   # Windows
   .\deploy.ps1 -Action deploy
   
   # Docker
   docker compose up -d --build
   ```

3. 验证更新
   ```bash
   curl http://localhost/api/v1/dashboard/stats
   ```

## 联系支持

如遇到问题，请检查：
1. 日志文件：`logs/service-stdout.log` 和 `logs/service-stderr.log`
2. 系统日志：`journalctl -u backend-admin` (Linux) 或 `launchctl list` (macOS)
3. Nginx 日志：`/var/log/nginx/` 或 `/usr/local/var/log/nginx/`
