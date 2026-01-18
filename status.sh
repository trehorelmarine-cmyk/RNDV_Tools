#!/bin/bash

# ============================================
# RNDV Server - Script de statut
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
SERVER_DIR="$PROJECT_DIR/server"

# Charger les variables d'environnement
if [ -f "$SERVER_DIR/.env" ]; then
    export $(grep -v '^#' "$SERVER_DIR/.env" | xargs)
fi

PORT=${PORT:-3000}
BASE_URL="http://localhost:$PORT"

# Fonction pour vérifier un endpoint
check_endpoint() {
    local url=$1
    local name=$2
    local response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$url" 2>/dev/null)

    if [ "$response" = "200" ]; then
        echo -e "  $CHECK ${GREEN}$name${NC}"
        echo -e "     ${WHITE}$url${NC}"
        return 0
    else
        echo -e "  $CROSS ${RED}$name${NC} (HTTP $response)"
        echo -e "     ${WHITE}$url${NC}"
        return 1
    fi
}

# Fonction pour vérifier l'API health
check_health() {
    local response=$(curl -s --connect-timeout 2 "$BASE_URL/api/health" 2>/dev/null)

    if [ -z "$response" ]; then
        return 1
    fi

    # Parser le JSON avec grep/sed basique
    local status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    local db=$(echo "$response" | grep -o '"database":"[^"]*"' | cut -d'"' -f4)

    if [ "$status" = "ok" ] && [ "$db" = "connected" ]; then
        return 0
    else
        return 1
    fi
}

# Affichage
clear
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}${WHITE}                 RNDV Server - Status                           ${NC}${BLUE}║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Vérifier si le serveur tourne
PID=$(lsof -t -i :$PORT 2>/dev/null)

if [ -z "$PID" ]; then
    echo -e "${RED}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║${NC}  $CROSS ${RED}SERVEUR ARRÊTÉ${NC}                                            ${RED}║${NC}"
    echo -e "${RED}║${NC}                                                                 ${RED}║${NC}"
    echo -e "${RED}║${NC}  Démarrez le serveur avec: ${WHITE}./start.sh${NC}                         ${RED}║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    exit 1
fi

echo -e "${CYAN}SERVEUR${NC}"
echo -e "  $CHECK ${GREEN}En cours d'exécution${NC}"
echo -e "     Port: ${WHITE}$PORT${NC}"
echo -e "     PID:  ${WHITE}$PID${NC}"
echo ""

# Vérifier la santé de l'API
echo -e "${CYAN}API HEALTH${NC}"
if check_health; then
    echo -e "  $CHECK ${GREEN}API fonctionnelle${NC}"
    echo -e "  $CHECK ${GREEN}Base de données connectée${NC}"
else
    echo -e "  $CROSS ${RED}API non disponible ou base de données déconnectée${NC}"
fi
echo ""

# Vérifier les applications
echo -e "${CYAN}APPLICATIONS${NC}"
echo ""

echo -e "  ${YELLOW}Roadmap Planning${NC}"
check_endpoint "$BASE_URL/roadmap/roadmap.html" "Page principale"
echo ""

echo -e "  ${YELLOW}Analyse Demandes RNDV${NC}"
check_endpoint "$BASE_URL/analyse/rapport_evolution.html" "Page principale"
echo ""

# Vérifier les endpoints API
echo -e "${CYAN}API ENDPOINTS${NC}"
echo ""
check_endpoint "$BASE_URL/api/health" "Health Check"
check_endpoint "$BASE_URL/api/tasks" "Liste des tâches"
check_endpoint "$BASE_URL/api/milestones" "Liste des jalons"
echo ""

# Résumé
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}COMMANDES DISPONIBLES${NC}"
echo -e "  ${WHITE}./start.sh${NC}   - Démarrer le serveur"
echo -e "  ${WHITE}./stop.sh${NC}    - Arrêter le serveur"
echo -e "  ${WHITE}./status.sh${NC}  - Afficher ce statut"
echo -e "  ${WHITE}tail -f server/server.log${NC} - Voir les logs"
echo ""
