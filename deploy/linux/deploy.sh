#!/bin/bash

set -e

DEPLOY_DIR="/opt/backend-admin"
SERVICE_NAME="backend-admin"
SERVICE_USER="backend-admin"
SERVICE_PORT="${PORT:-3000}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 20.x"
        log_info "On Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
        log_info "On CentOS/RHEL: curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash - && sudo yum install -y nodejs"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        log_warn "Node.js version $(node --version) is too old. Recommended: 20.x or higher"
    else
        log_info "Node.js version: $(node --version)"
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    if ! command -v nginx &> /dev/null; then
        log_warn "Nginx is not installed. Installing..."
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y nginx
        elif command -v yum &> /dev/null; then
            sudo yum install -y nginx
        else
            log_error "Could not install nginx. Please install it manually."
            exit 1
        fi
    fi
    
    if ! command -v systemctl &> /dev/null; then
        log_error "systemctl not found. This script requires systemd."
        exit 1
    fi
}

create_service_user() {
    if ! id "$SERVICE_USER" &>/dev/null; then
        log_info "Creating service user: $SERVICE_USER"
        sudo useradd -r -s /bin/false -d "$DEPLOY_DIR" "$SERVICE_USER"
    fi
}

setup_directories() {
    log_info "Setting up directories..."
    
    sudo mkdir -p "$DEPLOY_DIR"/{data,databases,logs,current,releases}
    sudo chown -R "$SERVICE_USER:$SERVICE_USER" "$DEPLOY_DIR"
    
    log_info "Directories created at $DEPLOY_DIR"
}

build_and_deploy() {
    local SOURCE_DIR="${1:-$(pwd)}"
    local RELEASE_DIR="$DEPLOY_DIR/releases/$(date +%Y%m%d%H%M%S)"
    
    log_info "Building project..."
    
    cd "$SOURCE_DIR"
    
    log_info "Installing backend dependencies..."
    npm ci --production
    
    log_info "Building backend..."
    npm run build
    
    cd frontend
    log_info "Installing frontend dependencies..."
    npm ci
    
    log_info "Building frontend..."
    npm run build
    
    cd "$SOURCE_DIR"
    
    log_info "Copying files to release directory..."
    sudo mkdir -p "$RELEASE_DIR"
    sudo cp -r dist "$RELEASE_DIR/dist"
    sudo cp -r frontend/dist "$RELEASE_DIR/frontend-dist"
    sudo cp package.json "$RELEASE_DIR/"
    sudo cp .env.production "$RELEASE_DIR/.env" 2>/dev/null || true
    
    cd "$RELEASE_DIR"
    npm ci --production
    
    log_info "Creating symlink to current release..."
    sudo ln -sfn "$RELEASE_DIR" "$DEPLOY_DIR/current"
    sudo chown -R "$SERVICE_USER:$SERVICE_USER" "$DEPLOY_DIR"
    
    log_info "Release deployed to $RELEASE_DIR"
}

create_systemd_service() {
    log_info "Creating systemd service..."
    
    cat << EOF | sudo tee /etc/systemd/system/${SERVICE_NAME}.service
[Unit]
Description=Backend Admin Management System
After=network.target
Wants=network.target

[Service]
Type=simple
User=${SERVICE_USER}
Group=${SERVICE_USER}
WorkingDirectory=${DEPLOY_DIR}/current
ExecStart=/usr/bin/node ${DEPLOY_DIR}/current/dist/main.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=${SERVICE_PORT}
Environment=PATH=/usr/local/bin:/usr/bin:/bin

# Security hardening
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=${DEPLOY_DIR}/data ${DEPLOY_DIR}/databases ${DEPLOY_DIR}/logs
ReadOnlyPaths=/
PrivateTmp=yes
PrivateDevices=yes
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes
MemoryDenyWriteExecute=yes
RestrictRealtime=yes
RestrictSUIDSGID=yes
RemoveIPC=yes
LockPersonality=yes
SystemCallArchitectures=native

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    log_info "Systemd service created"
}

configure_nginx() {
    log_info "Configuring Nginx..."
    
    cat << 'NGINX_EOF' | sudo tee /etc/nginx/sites-available/backend-admin
server {
    listen 80;
    server_name _;
    
    client_max_body_size 100M;
    
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 256;
    gzip_types 
        text/plain 
        text/css 
        text/xml 
        text/javascript 
        application/json 
        application/javascript 
        application/xml 
        image/svg+xml 
        font/ttf 
        font/otf 
        font/woff2;

    location / {
        root /opt/backend-admin/current/frontend-dist;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        location ~* \.(js|css|svg|ico|png|jpg|jpeg|gif|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    server_tokens off;
    
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
}
NGINX_EOF
    
    sudo ln -sf /etc/nginx/sites-available/backend-admin /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    sudo nginx -t && sudo systemctl reload nginx
    log_info "Nginx configured and reloaded"
}

configure_firewall() {
    log_info "Configuring firewall..."
    
    if command -v ufw &> /dev/null; then
        sudo ufw allow 80/tcp comment "HTTP"
        sudo ufw allow 443/tcp comment "HTTPS"
        sudo ufw --force enable
        log_info "UFW firewall configured"
    elif command -v firewall-cmd &> /dev/null; then
        sudo firewall-cmd --permanent --add-service=http
        sudo firewall-cmd --permanent --add-service=https
        sudo firewall-cmd --reload
        log_info "Firewalld configured"
    else
        log_warn "No firewall detected. Please configure manually."
    fi
}

setup_ssl_certs() {
    local DOMAIN="${1:-example.com}"
    
    log_info "Setting up SSL certificates for $DOMAIN..."
    
    if command -v certbot &> /dev/null; then
        sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN"
        log_info "SSL certificates installed via Certbot"
    elif command -v openssl &> /dev/null; then
        log_warn "Certbot not found. Generating self-signed certificate..."
        sudo mkdir -p /etc/nginx/ssl
        sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/nginx/ssl/server.key \
            -out /etc/nginx/ssl/server.crt \
            -subj "/CN=$DOMAIN"
        log_warn "Self-signed certificate generated. Replace with valid SSL cert for production."
    else
        log_warn "No SSL tool available. Configure SSL manually."
    fi
}

start_service() {
    log_info "Starting $SERVICE_NAME service..."
    sudo systemctl enable "$SERVICE_NAME"
    sudo systemctl start "$SERVICE_NAME"
    sleep 2
    sudo systemctl status "$SERVICE_NAME"
}

check_health() {
    log_info "Checking service health..."
    sleep 3
    
    if curl -s http://localhost:$SERVICE_PORT/api/v1/dashboard/stats > /dev/null 2>&1; then
        log_info "Backend is responding on port $SERVICE_PORT"
    else
        log_warn "Backend health check failed. Check logs: journalctl -u $SERVICE_NAME"
    fi
    
    if curl -s http://localhost > /dev/null 2>&1; then
        log_info "Nginx is responding on port 80"
    else
        log_warn "Nginx health check failed."
    fi
}

backup_database() {
    local BACKUP_DIR="${1:-$DEPLOY_DIR/backups}"
    local TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    
    log_info "Creating database backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    if [ -f "$DEPLOY_DIR/data/db.sqlite" ]; then
        cp "$DEPLOY_DIR/data/db.sqlite" "$BACKUP_DIR/db_backup_$TIMESTAMP.sqlite"
        log_info "Database backed up to $BACKUP_DIR/db_backup_$TIMESTAMP.sqlite"
    else
        log_warn "No database found at $DEPLOY_DIR/data/db.sqlite"
    fi
    
    # Clean old backups (keep last 30 days)
    find "$BACKUP_DIR" -name "*.sqlite" -mtime +30 -delete 2>/dev/null
}

show_status() {
    echo ""
    echo "============================================"
    echo "  Backend Admin System - Deployment Status"
    echo "============================================"
    echo ""
    echo "Service: $(sudo systemctl is-active $SERVICE_NAME 2>/dev/null || echo 'unknown')"
    echo "Nginx: $(systemctl is-active nginx 2>/dev/null || echo 'unknown')"
    echo "Port: $SERVICE_PORT"
    echo "Deploy Directory: $DEPLOY_DIR"
    echo "Current Release: $(readlink $DEPLOY_DIR/current 2>/dev/null || echo 'none')"
    echo ""
    echo "Useful commands:"
    echo "  View logs:        journalctl -u $SERVICE_NAME -f"
    echo "  Check status:     systemctl status $SERVICE_NAME"
    echo "  Restart:          systemctl restart $SERVICE_NAME"
    echo "  Backup:           $0 backup"
    echo "  Update:           $0 update"
    echo "============================================"
}

case "${1:-}" in
    install)
        check_prerequisites
        create_service_user
        setup_directories
        create_systemd_service
        configure_nginx
        configure_firewall
        start_service
        check_health
        show_status
        ;;
    update)
        SOURCE_DIR="${2:-.}"
        build_and_deploy "$SOURCE_DIR"
        sudo systemctl restart "$SERVICE_NAME"
        check_health
        show_status
        ;;
    start)
        start_service
        ;;
    stop)
        sudo systemctl stop "$SERVICE_NAME"
        log_info "Service stopped"
        ;;
    restart)
        sudo systemctl restart "$SERVICE_NAME"
        log_info "Service restarted"
        check_health
        ;;
    status)
        show_status
        ;;
    backup)
        backup_database
        ;;
    ssl)
        configure_ssl_certs "${2:-example.com}"
        ;;
    *)
        echo "Usage: $0 {install|update|start|stop|restart|status|backup|ssl}"
        echo ""
        echo "Commands:"
        echo "  install            - Full installation and deployment"
        echo "  update [dir]       - Build and deploy new version"
        echo "  start              - Start the service"
        echo "  stop               - Stop the service"
        echo "  restart            - Restart the service"
        echo "  status             - Show deployment status"
        echo "  backup             - Create database backup"
        echo "  ssl [domain]       - Setup SSL certificates"
        ;;
esac
