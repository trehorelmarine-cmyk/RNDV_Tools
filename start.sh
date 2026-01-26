#!/bin/bash

# ============================================
# RNDV Tools - Script de démarrage
# ============================================

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
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

SERVER_PORTS="$GATEWAY_PORT $DASHBOARD_PORT $ROADMAP_PORT $SPECTACLES_PORT"
CLIENT_PORTS="$DASHBOARD_CLIENT_PORT $ROADMAP_CLIENT_PORT $SPECTACLES_CLIENT_PORT"
ALL_PORTS="$SERVER_PORTS $CLIENT_PORTS"

LOG_DIR="$PROJECT_DIR/.logs"
mkdir -p "$LOG_DIR"

# Libérer les ports occupés
echo -e "${CYAN}Vérification des ports...${NC}"
FREED=0
for port in $ALL_PORTS; do
    PID=$(lsof -t -i :$port 2>/dev/null)
    if [ -n "$PID" ]; then
        kill $PID 2>/dev/null
        FREED=1
    fi
done

if [ "$FREED" -eq 1 ]; then
    sleep 2
    # Force kill si nécessaire
    for port in $ALL_PORTS; do
        PID=$(lsof -t -i :$port 2>/dev/null)
        if [ -n "$PID" ]; then
            kill -9 $PID 2>/dev/null
        fi
    done
    sleep 1
    echo -e "${YELLOW}Anciens processus arrêtés${NC}"
fi

# Démarrage de PostgreSQL
echo -e "${CYAN}Démarrage de PostgreSQL...${NC}"
cd "$PROJECT_DIR"
docker-compose up -d 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} PostgreSQL"
else
    echo -e "  ${YELLOW}⚠${NC} PostgreSQL (docker-compose non disponible ou déjà actif)"
fi

# Démarrage des serveurs
echo -e "${CYAN}Démarrage des applications...${NC}"
cd "$PROJECT_DIR"

nohup npm run dev > "$LOG_DIR/dev.log" 2>&1 &
DEV_PID=$!
echo $DEV_PID > "$LOG_DIR/dev.pid"

# Attendre que les serveurs démarrent
echo -ne "  Démarrage en cours"
for i in $(seq 1 10); do
    sleep 1
    echo -ne "."
    # Vérifier si au moins le gateway répond
    if lsof -i :$GATEWAY_PORT > /dev/null 2>&1; then
        break
    fi
done
echo ""

# Vérifier le statut de chaque service
ERRORS=0

check_port() {
    local port=$1
    local name=$2
    if lsof -i :$port > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} $name (port $port)"
    else
        echo -e "  ${RED}✗${NC} $name (port $port)"
        ERRORS=$((ERRORS + 1))
    fi
}

check_port $GATEWAY_PORT "Gateway"
check_port $DASHBOARD_PORT "Dashboard Server"
check_port $ROADMAP_PORT "Roadmap Server"
check_port $SPECTACLES_PORT "Spectacles Server"

# Les clients Vite peuvent prendre plus de temps
sleep 3
check_port $DASHBOARD_CLIENT_PORT "Dashboard Client"
check_port $ROADMAP_CLIENT_PORT "Roadmap Client"
check_port $SPECTACLES_CLIENT_PORT "Spectacles Client"

# Affichage
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}${WHITE}                   RNDV Tools v1.0.0                           ${NC}${BLUE}║${NC}"
echo -e "${BLUE}╠═══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC}  ${CYAN}APPLICATIONS${NC}                                                   ${BLUE}║${NC}"
echo -e "${BLUE}╠═══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC}                                                               ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  ${YELLOW}Gateway (Landing Page)${NC}                                         ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}     ${WHITE}http://localhost:${GATEWAY_PORT}${NC}                                     ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}                                                               ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  ${YELLOW}Dashboard${NC}                                                      ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}     Client: ${WHITE}http://localhost:${DASHBOARD_CLIENT_PORT}${NC}                         ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}     Server: ${WHITE}http://localhost:${DASHBOARD_PORT}${NC}                              ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}                                                               ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  ${YELLOW}Roadmap${NC}                                                        ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}     Client: ${WHITE}http://localhost:${ROADMAP_CLIENT_PORT}${NC}                         ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}     Server: ${WHITE}http://localhost:${ROADMAP_PORT}${NC}                              ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}                                                               ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  ${YELLOW}Spectacles${NC}                                                     ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}     Client: ${WHITE}http://localhost:${SPECTACLES_CLIENT_PORT}${NC}                         ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}     Server: ${WHITE}http://localhost:${SPECTACLES_PORT}${NC}                              ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}                                                               ${BLUE}║${NC}"
echo -e "${BLUE}╠═══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC}  ${CYAN}COMMANDES${NC}                                                      ${BLUE}║${NC}"
echo -e "${BLUE}╠═══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC}  Arrêter:  ${WHITE}./stop.sh${NC}                                            ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  Statut:   ${WHITE}./status.sh${NC}                                          ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  Logs:     ${WHITE}tail -f .logs/dev.log${NC}                                ${BLUE}║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$ERRORS" -gt 0 ]; then
    echo -e "${YELLOW}⚠ $ERRORS service(s) n'ont pas démarré. Consultez .logs/dev.log${NC}"
fi
