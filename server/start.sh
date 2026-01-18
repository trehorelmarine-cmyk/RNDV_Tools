#!/bin/bash

# ============================================
# RNDV Server - Script de démarrage
# ============================================

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Chemin du script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Charger les variables d'environnement
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

PORT=${PORT:-3000}

# Vérifier si le serveur tourne déjà
if lsof -i :$PORT > /dev/null 2>&1; then
    echo -e "${YELLOW}Le serveur tourne déjà sur le port $PORT${NC}"
    PID=$(lsof -t -i :$PORT)
    echo -e "${YELLOW}PID: $PID${NC}"
else
    # Démarrer le serveur
    echo -e "${CYAN}Démarrage du serveur RNDV...${NC}"
    nohup node server.js > server.log 2>&1 &
    PID=$!
    sleep 2

    # Vérifier que le serveur a démarré
    if ! lsof -i :$PORT > /dev/null 2>&1; then
        echo -e "\033[0;31mErreur: Le serveur n'a pas démarré. Consultez server.log${NC}"
        exit 1
    fi
fi

# Affichage
clear
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}${WHITE}                    RNDV Server v1.0.0                         ${NC}${BLUE}║${NC}"
echo -e "${BLUE}╠═══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC}  ${GREEN}Statut:${NC} En cours d'exécution                                  ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  ${GREEN}Port:${NC}   ${WHITE}$PORT${NC}                                                   ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  ${GREEN}PID:${NC}    ${WHITE}$(lsof -t -i :$PORT)${NC}                                                  ${BLUE}║${NC}"
echo -e "${BLUE}╠═══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC}  ${CYAN}APPLICATIONS DISPONIBLES${NC}                                      ${BLUE}║${NC}"
echo -e "${BLUE}╠═══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC}                                                                 ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  ${YELLOW}1. Roadmap Planning${NC}                                            ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}     Planning interactif Gantt pour la Comédie-Française        ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}     ${WHITE}http://localhost:$PORT/roadmap/roadmap.html${NC}                  ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}                                                                 ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  ${YELLOW}2. Analyse Demandes RNDV${NC}                                       ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}     Dashboard d'analyse des demandes                            ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}     ${WHITE}http://localhost:$PORT/analyse/rapport_evolution.html${NC}        ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}                                                                 ${BLUE}║${NC}"
echo -e "${BLUE}╠═══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC}  ${CYAN}API ENDPOINTS${NC}                                                  ${BLUE}║${NC}"
echo -e "${BLUE}╠═══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC}  GET    /api/tasks           Liste des tâches                  ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  POST   /api/tasks/bulk      Sauvegarder les tâches            ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  GET    /api/health          État du serveur                   ${BLUE}║${NC}"
echo -e "${BLUE}╠═══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC}  ${CYAN}COMMANDES${NC}                                                      ${BLUE}║${NC}"
echo -e "${BLUE}╠═══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC}  Arrêter:  ${WHITE}./stop.sh${NC}  ou  ${WHITE}kill $(lsof -t -i :$PORT)${NC}                         ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  Logs:     ${WHITE}tail -f server.log${NC}                                   ${BLUE}║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
