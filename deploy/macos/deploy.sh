#!/bin/bash

set -e

DEPLOY_DIR="/opt/backend-admin"
SERVICE_NAME="com.backend.admin"
SERVICE_PORT="${PORT:-3000}"
LAUNCHD_PLIST="$HOME/Library/LaunchAgents/$SERVICE_NAME.plist"

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
    log_info "Checking prerequisites on macOS..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 20.x"
        log_info "Option 1: Download from https://nodejs.org"
        log_info "Option 2: brew install node@20"
        log_info "Option 3: nvm install 20"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        log_warn "Node.js version $(node --version) is too old. Recommended: 20.x or higher"
    else
        log_info "Node.js version: $(node --version)"
    fi
    
    if ! command -v brew &> /dev/null; then
        log_warn "Homebrew not installed. Recommended for package management."
        log_info "Install: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    fi
    
    if ! command -v nginx &> /dev/null; then
        log_warn "Nginx not found. Installing via Homebrew..."
        if command -v brew &> /dev/null; then
            brew install nginx
        else
            log_error "Cannot install nginx automatically. Please install manually."
            exit 1
        fi
    fi
    
    log_info "Nginx version: $(nginx -v 2>&1)"
}

setup_directories() {
    log_info "Setting up directories..."
    
    mkdir -p "$DEPLOY_DIR"/{data,databases,logs,current,releases}
    mkdir -p "$HOME/Library/LaunchAgents"
    
    log_info "Directories created"
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
    mkdir -p "$RELEASE_DIR"
    cp -r dist "$RELEASE_DIR/dist"
    cp -r frontend/dist "$RELEASE_DIR/frontend-dist"
    cp package.json "$RELEASE_DIR/"
    cp .env.production "$RELEASE_DIR/.env" 2>/dev/null || true
    
    cd "$RELEASE_DIR"
    npm ci --production
    
    log_info "Creating symlink to current release..."
    ln -sfn "$RELEASE_DIR" "$DEPLOY_DIR/current"
    
    log_info "Release deployed to $RELEASE_DIR"
}

create_launchd_plist() {
    log_info "Creating launchd plist..."
    
    cat << EOF | tee "$LAUNCHD_PLIST"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$SERVICE_NAME</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>$(which node)</string>
        <string>$DEPLOY_DIR/current/dist/main.js</string>
    </array>
    
    <key>WorkingDirectory</key>
    <string>$DEPLOY_DIR/current</string>
    
    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
        <key>PORT</key>
        <string>$SERVICE_PORT</string>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/opt/homebrew/bin</string>
    </dict>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
    
    <key>ThrottleInterval</key>
    <integer>5</integer>
    
    <key>StandardOutPath</key>
    <string>$DEPLOY_DIR/logs/service-stdout.log</string>
    
    <key>StandardErrorPath</key>
    <string>$DEPLOY_DIR/logs/service-stderr.log</string>
    
    <key>LogFileMode</key>
    <integer>0644</integer>
    
    <key>LimitLoadToHosts</key>
    <array>
        <string>localhost</string>
    </array>
</dict>
</plist>
EOF
    
    log_info "Launchd plist created at $LAUNCHD_PLIST"
}

configure_nginx() {
    log_info "Configuring Nginx..."
    
    local NGINX_CONF_PATH="/usr/local/etc/nginx/servers/backend-admin.conf"
    local NGINX_CONF_PATH_ALT="/opt/homebrew/etc/nginx/servers/backend-admin.conf"
    
    mkdir -p "$(dirname "$NGINX_CONF_PATH")" 2>/dev/null || mkdir -p "$(dirname "$NGINX_CONF_PATH_ALT")"
    
    local FINAL_PATH=""
    if [ -d "/usr/local/etc/nginx/servers" ]; then
        FINAL_PATH="$NGINX_CONF_PATH"
    elif [ -d "/opt/homebrew/etc/nginx/servers" ]; then
        FINAL_PATH="$NGINX_CONF_PATH_ALT"
    else
        FINAL_PATH="/usr/local/etc/nginx/backend-admin.conf"
        mkdir -p "$(dirname "$FINAL_PATH")"
    fi
    
    cat << 'NGINX_EOF' | tee "$FINAL_PATH"
server {
    listen 80;
    server_name localhost;
    
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
}
NGINX_EOF
    
    nginx -t && nginx -s reload
    log_info "Nginx configured and reloaded"
}

setup_ssl_certs() {
    local DOMAIN="${1:-localhost}"
    
    log_info "Setting up SSL certificates for $DOMAIN..."
    
    local SSL_DIR="$DEPLOY_DIR/ssl"
    mkdir -p "$SSL_DIR"
    
    if command -v certbot &> /dev/null; then
        log_info "Certbot found. Installing certificate..."
        certbot certonly --standalone -d "$DOMAIN" --agree-tos --non-interactive
    elif command -v mkcert &> /dev/null; then
        log_info "mkcert found. Creating local certificate..."
        mkcert "$DOMAIN"
        mkdir -p "$SSL_DIR"
        mv "$DOMAIN.pem" "$SSL_DIR/server.crt"
        mv "$DOMAIN-key.pem" "$SSL_DIR/server.key"
    elif command -v openssl &> /dev/null; then
        log_warn "Generating self-signed certificate..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$SSL_DIR/server.key" \
            -out "$SSL_DIR/server.crt" \
            -subj "/CN=$DOMAIN"
        log_warn "Self-signed certificate generated. For production, use Let's Encrypt or similar."
    fi
}

start_service() {
    log_info "Starting backend service..."
    
    launchctl unload "$LAUNCHD_PLIST" 2>/dev/null || true
    launchctl load "$LAUNCHD_PLIST"
    
    sleep 2
    log_info "Service started via launchd"
}

stop_service() {
    log_info "Stopping backend service..."
    launchctl unload "$LAUNCHD_PLIST" 2>/dev/null || true
    log_info "Service stopped"
}

restart_service() {
    log_info "Restarting backend service..."
    launchctl unload "$LAUNCHD_PLIST" 2>/dev/null || true
    sleep 1
    launchctl load "$LAUNCHD_PLIST"
    log_info "Service restarted"
}

check_health() {
    log_info "Checking service health..."
    sleep 2
    
    if curl -s http://localhost:$SERVICE_PORT/api/v1/dashboard/stats > /dev/null 2>&1; then
        log_info "Backend is responding on port $SERVICE_PORT"
    else
        log_warn "Backend health check failed. Check logs: $DEPLOY_DIR/logs/"
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
    
    find "$BACKUP_DIR" -name "*.sqlite" -mtime +30 -delete 2>/dev/null
}

show_status() {
    echo ""
    echo "============================================"
    echo "  Backend Admin System - macOS Deployment"
    echo "============================================"
    echo ""
    echo "Service: $(launchctl list "$SERVICE_NAME" 2>/dev/null | grep -v '^-' || echo 'not running')"
    echo "Port: $SERVICE_PORT"
    echo "Deploy Directory: $DEPLOY_DIR"
    echo "Launchd Plist: $LAUNCHD_PLIST"
    echo "Current Release: $(readlink "$DEPLOY_DIR/current" 2>/dev/null || echo 'none')"
    echo ""
    echo "Useful commands:"
    echo "  View logs:        tail -f $DEPLOY_DIR/logs/"
    echo "  Check service:    launchctl list $SERVICE_NAME"
    echo "  Restart service:  $0 restart"
    echo "  Backup:           $0 backup"
    echo "  Console logs:     console show | grep $SERVICE_NAME"
    echo "============================================"
}

full_deploy() {
    check_prerequisites
    setup_directories
    build_and_deploy "${1:-.}"
    create_launchd_plist
    configure_nginx
    start_service
    check_health
    show_status
}

case "${1:-}" in
    install)
        full_deploy "${2:-.}"
        ;;
    update)
        SOURCE_DIR="${2:-.}"
        build_and_deploy "$SOURCE_DIR"
        restart_service
        check_health
        ;;
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        restart_service
        ;;
    status)
        show_status
        ;;
    backup)
        backup_database
        ;;
    ssl)
        setup_ssl_certs "${2:-localhost}"
        ;;
    uninstall)
        stop_service
        rm -f "$LAUNCHD_PLIST"
        log_info "Service uninstalled"
        ;;
    *)
        echo "Usage: $0 {install|update|start|stop|restart|status|backup|ssl|uninstall}"
        echo ""
        echo "Commands:"
        echo "  install [dir]        - Full installation and deployment"
        echo "  update [dir]         - Build and deploy new version"
        echo "  start                - Start the service"
        echo "  stop                 - Stop the service"
        echo "  restart              - Restart the service"
        echo "  status               - Show deployment status"
        echo "  backup               - Create database backup"
        echo "  ssl [domain]         - Setup SSL certificates"
        echo "  uninstall            - Remove the service"
        ;;
esac
