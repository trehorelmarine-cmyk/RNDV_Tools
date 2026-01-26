#!/bin/bash

# ============================================
# RNDV Tools - Script d'arrêt
# ============================================

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Chemin du projet
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Charger les variables d'environnement
if [ -f "$PROJECT_DIR/.env" ]; then
    export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

# Ports
GATEWAY_PORT=${GATEWAY_PORT:-3005}
DASHBOARD_PORT=${DASHBOARD_PORT:-3001}
ROADMAP_PORT=${ROADMAP_PORT:-3002}
SPECTACLES_PORT=${SPECTACLES_PORT:-3003}
DASHBOARD_CLIENT_PORT=${DASHBOARD_CLIENT_PORT:-5173}
ROADMAP_CLIENT_PORT=${ROADMAP_CLIENT_PORT:-5174}
SPECTACLES_CLIENT_PORT=${SPECTACLES_CLIENT_PORT:-5175}

ALL_PORTS="$GATEWAY_PORT $DASHBOARD_PORT $ROADMAP_PORT $SPECTACLES_PORT $DASHBOARD_CLIENT_PORT $ROADMAP_CLIENT_PORT $SPECTACLES_CLIENT_PORT"

LOG_DIR="$PROJECT_DIR/.logs"

echo -e "${CYAN}Arrêt de RNDV Tools...${NC}"

# Arrêter via le PID stocké (processus concurrently parent)
if [ -f "$LOG_DIR/dev.pid" ]; then
    PARENT_PID=$(cat "$LOG_DIR/dev.pid")
    if ps -p $PARENT_PID > /dev/null 2>&1; then
        kill -- -$(ps -o pgid= -p $PARENT_PID | tr -d ' ') 2>/dev/null
        sleep 1
    fi
    rm -f "$LOG_DIR/dev.pid"
fi

# Arrêter tous les processus sur les ports utilisés
STOPPED=0
for port in $ALL_PORTS; do
    PID=$(lsof -t -i :$port 2>/dev/null)
    if [ -n "$PID" ]; then
        kill $PID 2>/dev/null
        STOPPED=$((STOPPED + 1))
    fi
done

if [ "$STOPPED" -gt 0 ]; then
    sleep 2
    # Force kill si nécessaire
    for port in $ALL_PORTS; do
        PID=$(lsof -t -i :$port 2>/dev/null)
        if [ -n "$PID" ]; then
            kill -9 $PID 2>/dev/null
        fi
    done
fi

# Vérification finale
REMAINING=0
for port in $ALL_PORTS; do
    if lsof -i :$port > /dev/null 2>&1; then
        REMAINING=$((REMAINING + 1))
    fi
done

if [ "$REMAINING" -eq 0 ]; then
    echo -e "${GREEN}✓ Tous les services RNDV Tools arrêtés${NC}"
else
    echo -e "${YELLOW}⚠ $REMAINING service(s) encore actif(s)${NC}"
fi

# Optionnel: arrêter PostgreSQL
if [ "$1" = "--all" ]; then
    echo -e "${CYAN}Arrêt de PostgreSQL...${NC}"
    cd "$PROJECT_DIR"
    docker-compose down 2>/dev/null
    echo -e "${GREEN}✓ PostgreSQL arrêté${NC}"
fi
