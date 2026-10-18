# syntax=docker/dockerfile:1.6

# ==========================
# Build Stage - Development Environment
# ==========================
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装依赖和构建工具
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    git \
    python3 \
    && python3 -m ensurepip --upgrade --default-pip

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装所有依赖（包括开发依赖）
RUN npm ci --ignore-scripts --only=dev && \
    npm rebuild bcrypt-nodejs || true

# 复制源代码
COPY . .

# 创建必要的目录
RUN mkdir -p dist coverage logs databases

# 构建应用
RUN npm run build || true

# ==========================
# Production Stage - Optimized Multi-stage Build
# ==========================
FROM node:20-alpine AS production

# 设置环境变量
ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn \
    TZ=Asia/Shanghai \
    PORT=3000 \
    DB_HOST=localhost \
    DB_PORT=5432 \
    DB_USERNAME=root \
    DB_PASSWORD=password \
    DB_NAME=admin \
    REDIS_HOST=localhost \
    REDIS_PORT=6379

# 安装运行时依赖
RUN apk add --no-cache \
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# 从构建阶段复制需要的文件
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/src ./src

# 设置权限
RUN chown -R nodejs:nodejs /app

USER nodejs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# 启动命令（使用 dumb-init 作为 PID 1）
CMD ["dumb-init", "node", "dist/main"]

# ==========================
# Debug Stage - For Development
# ==========================
FROM node:20-alpine AS debug

# 保留源代码和调试信息
COPY --from=builder /app/ /app/

WORKDIR /app
USER nodejs

# 暴露调试端口
EXPOSE 3000 9229

CMD ["node", "--inspect=0.0.0.0:9229", "dist/main"]
