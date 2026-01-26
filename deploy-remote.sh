#!/bin/bash

# RNDV Tools - Remote Deployment Script
# Usage: ./deploy-remote.sh [command] [service]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Load config
CONFIG_FILE=".deploy.env"
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
else
    echo -e "${YELLOW}[WARN]${NC} No .deploy.env found. Creating template..."
    cat > "$CONFIG_FILE" << 'EOF'
# Remote server configuration
REMOTE_HOST="studio.vitess.tech"
REMOTE_USER="root"
REMOTE_PATH="/opt/apps/rndv"
SSH_KEY=""  # Optional: path to SSH key
EOF
    echo -e "${GREEN}[INFO]${NC} Created .deploy.env - please configure it and retry."
    exit 1
fi

# Validate config
if [ -z "$REMOTE_HOST" ] || [ "$REMOTE_HOST" = "your-server.com" ]; then
    echo -e "${RED}[ERROR]${NC} Please configure REMOTE_HOST in .deploy.env"
    exit 1
fi

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_cmd() { echo -e "${CYAN}[CMD]${NC} $1"; }

# Build SSH command
ssh_cmd() {
    local cmd="ssh"
    if [ -n "$SSH_KEY" ]; then
        cmd="$cmd -i $SSH_KEY"
    fi
    cmd="$cmd ${REMOTE_USER}@${REMOTE_HOST}"
    echo "$cmd"
}

# Execute command on remote server
remote_exec() {
    local cmd="$1"
    log_cmd "$cmd"
    $(ssh_cmd) "cd $REMOTE_PATH && $cmd"
}

# Full deployment
deploy_all() {
    log_info "Starting full deployment..."
    remote_exec "./deploy.sh deploy"
    log_info "Full deployment complete!"
}

# Quick deploy (restart without rebuild)
deploy_quick() {
    log_info "Quick deployment (no rebuild)..."
    remote_exec "git pull && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d"
    log_info "Quick deployment complete!"
}

# Build and restart specific service(s)
deploy_service() {
    local services="$1"
    if [ -z "$services" ]; then
        log_error "Usage: ./deploy-remote.sh service <service1> [service2] ..."
        echo ""
        echo "Available services:"
        echo "  rndv-client, rndv-server, postgres"
        exit 1
    fi

    log_info "Deploying service(s): $services"
    remote_exec "git pull"
    remote_exec "docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache $services"
    remote_exec "docker compose -f docker-compose.prod.yml --env-file .env.prod up -d $services"
    log_info "Service deployment complete!"
}

# Show logs
show_logs() {
    local service="$1"
    if [ -z "$service" ]; then
        remote_exec "docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f --tail=100"
    else
        remote_exec "docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f --tail=100 $service"
    fi
}

# Show status
show_status() {
    remote_exec "docker compose -f docker-compose.prod.yml --env-file .env.prod ps"
}

# Restart service(s)
restart_service() {
    local services="$1"
    if [ -z "$services" ]; then
        log_info "Restarting all services..."
        remote_exec "docker compose -f docker-compose.prod.yml --env-file .env.prod restart"
    else
        log_info "Restarting: $services"
        remote_exec "docker compose -f docker-compose.prod.yml --env-file .env.prod restart $services"
    fi
}

# Execute arbitrary command
exec_cmd() {
    local cmd="$1"
    if [ -z "$cmd" ]; then
        log_error "Usage: ./deploy-remote.sh exec '<command>'"
        exit 1
    fi
    remote_exec "$cmd"
}

# SSH into server
ssh_connect() {
    log_info "Connecting to $REMOTE_HOST..."
    $(ssh_cmd) -t "cd $REMOTE_PATH && bash"
}

# Print help
print_help() {
    echo "RNDV Tools - Remote Deployment"
    echo ""
    echo -e "${CYAN}Usage:${NC} ./deploy-remote.sh [command] [args]"
    echo ""
    echo -e "${CYAN}Commands:${NC}"
    echo "  deploy          Full deployment (git pull + build all + restart)"
    echo "  quick           Quick deploy (git pull + restart, no rebuild)"
    echo "  service <name>  Build and deploy specific service(s)"
    echo "  restart [name]  Restart service(s) (all if no name given)"
    echo "  logs [name]     Show logs (all or specific service)"
    echo "  status          Show services status"
    echo "  ssh             SSH into the server"
    echo "  exec '<cmd>'    Execute arbitrary command on server"
    echo ""
    echo -e "${CYAN}Services:${NC}"
    echo "  rndv-client, rndv-server, postgres"
}

# Main
case "${1:-help}" in
    deploy)
        deploy_all
        ;;
    quick)
        deploy_quick
        ;;
    service)
        shift
        deploy_service "$*"
        ;;
    restart)
        shift
        restart_service "$*"
        ;;
    logs)
        show_logs "$2"
        ;;
    status)
        show_status
        ;;
    ssh)
        ssh_connect
        ;;
    exec)
        shift
        exec_cmd "$*"
        ;;
    *)
        print_help
        ;;
esac
