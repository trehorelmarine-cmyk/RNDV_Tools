#!/bin/bash
# Configuration de la mise à jour automatique quotidienne du tableau de bord RNDV

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
UPDATE_SCRIPT="$SCRIPT_DIR/update_dashboard.py"
LOG_FILE="$SCRIPT_DIR/update.log"

echo "========================================"
echo "Configuration mise à jour automatique"
echo "========================================"
echo ""

# Vérifier que le script existe
if [ ! -f "$UPDATE_SCRIPT" ]; then
    echo "❌ Script update_dashboard.py non trouvé"
    exit 1
fi

# Créer la tâche cron (tous les jours à 8h00)
CRON_JOB="0 8 * * * /usr/bin/python3 $UPDATE_SCRIPT >> $LOG_FILE 2>&1"

# Vérifier si la tâche existe déjà
if crontab -l 2>/dev/null | grep -q "$UPDATE_SCRIPT"; then
    echo "✓ La tâche cron existe déjà"
else
    # Ajouter la tâche
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✓ Tâche cron ajoutée (mise à jour tous les jours à 8h00)"
fi

echo ""
echo "Configuration terminée!"
echo ""
echo "Commandes utiles:"
echo "  Voir les tâches cron:    crontab -l"
echo "  Supprimer la tâche:      crontab -e (puis supprimer la ligne)"
echo "  Mise à jour manuelle:    python3 $UPDATE_SCRIPT"
echo "  Logs:                    cat $LOG_FILE"
