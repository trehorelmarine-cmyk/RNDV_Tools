#!/bin/bash

# RNDV Tools - Production Deployment Script
# Usage: ./deploy.sh [command]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites
check_prereqs() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
}

# Ensure proxy-network exists
ensure_network() {
    if ! docker network inspect proxy-network &> /dev/null; then
        log_info "Creating proxy-network..."
        docker network create proxy-network
    fi
}

# Setup
setup() {
    log_info "Starting setup..."

    if [ ! -f "$ENV_FILE" ]; then
        log_error ".env.prod not found. Copy .env.prod.example to .env.prod and configure it."
        exit 1
    fi

    ensure_network

    log_info "Building Docker images..."
    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE build

    log_info "Setup complete! Run './deploy.sh start' to start the services."
}

# Full initialization for a new server
init() {
    log_info "=== RNDV Tools - Initialisation ==="

    # Generate PostgreSQL password
    POSTGRES_PWD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 24)

    # Ask for ClickUp token
    read -p "ClickUp API Token (optional, press Enter to skip): " CLICKUP_TOKEN

    # Create .env.prod
    log_info "Creation de .env.prod..."
    cat > .env.prod << EOF
# PostgreSQL
POSTGRES_USER=rndv_prod
POSTGRES_PASSWORD=$POSTGRES_PWD

# ClickUp Integration (optional)
CLICKUP_API_TOKEN=$CLICKUP_TOKEN

# Google Sheets (optional)
GOOGLE_SHEET_ID=
EOF

    # Ensure network
    ensure_network

    # Build and start
    log_info "Build des images Docker..."
    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE build

    log_info "Demarrage des services..."
    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d

    # Wait for services
    log_info "Attente du demarrage..."
    sleep 10

    # Show status
    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE ps

    echo ""
    log_info "=== Initialisation terminee ==="
    echo ""
    echo "RNDV Tools est pret."
    echo "N'oubliez pas de demarrer le proxy (dans /opt/apps/proxy)."
    echo ""
    log_info "Mot de passe PostgreSQL: $POSTGRES_PWD"
}

# Deploy (pull & restart)
deploy() {
    log_info "Deploying..."

    if [ -d .git ]; then
        log_info "Pulling latest code..."
        git pull
    fi

    ensure_network

    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE build
    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d

    log_info "Deployment complete!"
}

# Start services
start() {
    log_info "Starting services..."
    ensure_network
    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d
    log_info "Services started!"
    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE ps
}

# Stop services
stop() {
    log_info "Stopping services..."
    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE down
    log_info "Services stopped"
}

# Show logs
logs() {
    local service=$1
    if [ -z "$service" ]; then
        docker compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f
    else
        docker compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f $service
    fi
}

# Show status
status() {
    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE ps
}

# Backup database
backup() {
    local backup_file="backup_rndv_$(date +%Y%m%d_%H%M%S).sql"
    log_info "Creating backup: $backup_file"
    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T postgres pg_dumpall -U ${POSTGRES_USER:-postgres} > $backup_file
    log_info "Backup created: $backup_file"
}

# Main
check_prereqs

case "${1:-help}" in
    init)
        init
        ;;
    setup)
        setup
        ;;
    deploy)
        deploy
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        stop
        start
        ;;
    logs)
        logs $2
        ;;
    status)
        status
        ;;
    backup)
        backup
        ;;
    *)
        echo "RNDV Tools - Production Deployment"
        echo ""
        echo "Usage: ./deploy.sh [command]"
        echo ""
        echo "Commands:"
        echo "  init      Full initialization for a NEW server (interactive)"
        echo "  setup     Setup for existing config (build images)"
        echo "  deploy    Pull code, rebuild and restart"
        echo "  start     Start all services"
        echo "  stop      Stop all services"
        echo "  restart   Restart all services"
        echo "  logs      Show logs (optionally: logs <service>)"
        echo "  status    Show services status"
        echo "  backup    Backup database"
        ;;
esac
