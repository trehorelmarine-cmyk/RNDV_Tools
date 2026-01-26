#!/bin/bash

# ============================================
# RNDV Tools - Script de statut
# ============================================

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# Symboles
CHECK="${GREEN}✓${NC}"
CROSS="${RED}✗${NC}"
WARN="${YELLOW}⚠${NC}"

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

# Compteurs
RUNNING=0
STOPPED=0

# Fonction pour vérifier un port
check_service() {
    local port=$1
    local name=$2
    local url=$3
    local PID=$(lsof -t -i :$port 2>/dev/null)

    if [ -n "$PID" ]; then
        echo -e "  $CHECK ${GREEN}$name${NC}"
        echo -e "     Port: ${WHITE}$port${NC}  PID: ${WHITE}$PID${NC}"
        if [ -n "$url" ]; then
            echo -e "     ${WHITE}$url${NC}"
        fi
        RUNNING=$((RUNNING + 1))
    else
        echo -e "  $CROSS ${RED}$name${NC}"
        echo -e "     Port: ${WHITE}$port${NC}  ${RED}Arrêté${NC}"
        STOPPED=$((STOPPED + 1))
    fi
}

# Fonction pour vérifier PostgreSQL
check_postgres() {
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q postgres; then
        echo -e "  $CHECK ${GREEN}PostgreSQL${NC} (Docker)"
    elif pg_isready -q 2>/dev/null; then
        echo -e "  $CHECK ${GREEN}PostgreSQL${NC} (local)"
    else
        echo -e "  $CROSS ${RED}PostgreSQL${NC}"
        STOPPED=$((STOPPED + 1))
    fi
}

# Affichage
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}${WHITE}                  RNDV Tools - Status                           ${NC}${BLUE}║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Base de données
echo -e "${CYAN}BASE DE DONNÉES${NC}"
check_postgres
echo ""

# Serveurs backend
echo -e "${CYAN}SERVEURS BACKEND${NC}"
check_service $GATEWAY_PORT "Gateway" "http://localhost:$GATEWAY_PORT"
check_service $DASHBOARD_PORT "Dashboard Server" "http://localhost:$DASHBOARD_PORT"
check_service $ROADMAP_PORT "Roadmap Server" "http://localhost:$ROADMAP_PORT"
check_service $SPECTACLES_PORT "Spectacles Server" "http://localhost:$SPECTACLES_PORT"
echo ""

# Clients frontend
echo -e "${CYAN}CLIENTS FRONTEND (Vite)${NC}"
check_service $DASHBOARD_CLIENT_PORT "Dashboard Client" "http://localhost:$DASHBOARD_CLIENT_PORT"
check_service $ROADMAP_CLIENT_PORT "Roadmap Client" "http://localhost:$ROADMAP_CLIENT_PORT"
check_service $SPECTACLES_CLIENT_PORT "Spectacles Client" "http://localhost:$SPECTACLES_CLIENT_PORT"
echo ""

# Résumé
TOTAL=$((RUNNING + STOPPED))
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
if [ "$STOPPED" -eq 0 ]; then
    echo -e "  ${GREEN}✓ $RUNNING/$TOTAL services actifs${NC}"
elif [ "$RUNNING" -eq 0 ]; then
    echo -e "  ${RED}✗ Aucun service actif${NC}"
    echo -e "  Démarrez avec: ${WHITE}./start.sh${NC}"
else
    echo -e "  ${YELLOW}⚠ $RUNNING/$TOTAL services actifs ($STOPPED arrêté(s))${NC}"
fi
echo ""
echo -e "${CYAN}COMMANDES${NC}"
echo -e "  ${WHITE}./start.sh${NC}          - Démarrer tous les services"
echo -e "  ${WHITE}./stop.sh${NC}           - Arrêter tous les services"
echo -e "  ${WHITE}./stop.sh --all${NC}     - Arrêter services + PostgreSQL"
echo -e "  ${WHITE}tail -f .logs/dev.log${NC} - Voir les logs"
echo ""
