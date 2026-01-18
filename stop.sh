#!/bin/bash

# ============================================
# RNDV Server - Script d'arrêt
# ============================================

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Chemin du projet
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$PROJECT_DIR/server"

# Charger les variables d'environnement
if [ -f "$SERVER_DIR/.env" ]; then
    export $(grep -v '^#' "$SERVER_DIR/.env" | xargs)
fi

PORT=${PORT:-3000}

# Trouver et arrêter le processus
PID=$(lsof -t -i :$PORT 2>/dev/null)

if [ -z "$PID" ]; then
    echo -e "${YELLOW}Aucun serveur ne tourne sur le port $PORT${NC}"
else
    kill $PID 2>/dev/null
    sleep 1

    if lsof -i :$PORT > /dev/null 2>&1; then
        kill -9 $PID 2>/dev/null
    fi

    echo -e "${GREEN}Serveur RNDV arrêté (PID: $PID)${NC}"
fi
