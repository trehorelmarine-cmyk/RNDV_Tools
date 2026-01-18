# RNDV Tools

> Suite d'outils pour la gestion de projet RNDV - Comédie-Française

## Table des matières

- [Aperçu](#aperçu)
- [Structure du projet](#structure-du-projet)
- [Installation rapide](#installation-rapide)
- [Applications](#applications)
- [Serveur](#serveur)
- [API](#api)
- [Scripts](#scripts)
- [Base de données](#base-de-données)

---

## Aperçu

Ce projet contient plusieurs outils pour la gestion du projet RNDV :

| Application | Description | URL |
|-------------|-------------|-----|
| **Roadmap Planning** | Planning interactif Gantt | http://localhost:3000/roadmap/roadmap.html |
| **Analyse Demandes** | Dashboard d'analyse des demandes | http://localhost:3000/analyse/rapport_evolution.html |
| **Teams Exporter** | Extension Chrome pour exporter les conversations Teams | - |

---

## Structure du projet

```
RNDV/
├── client/                              # Applications frontend
│   ├── Roadmap/                         # Planning Gantt interactif
│   │   ├── roadmap.html                 # Application principale
│   │   ├── Logo_RNDV.png                # Logo
│   │   ├── README.md                    # Documentation technique
│   │   └── .claude/agents/              # Agents Claude Code
│   │
│   └── analyse_demande_rndv/            # Dashboard d'analyse
│       ├── rapport_evolution.html       # Dashboard principal
│       ├── data_chart.json              # Données des graphiques
│       ├── data_rndv.csv                # Données brutes CSV
│       ├── update_dashboard.py          # Script de mise à jour
│       ├── start_server.py              # Serveur Python local
│       └── setup_auto_update.sh         # Configuration auto-update
│
├── server/                              # Backend Node.js
│   ├── server.js                        # Serveur Express
│   ├── package.json                     # Dépendances npm
│   ├── .env                             # Configuration (non versionné)
│   ├── .env.example                     # Exemple de configuration
│   ├── SETUP.md                         # Guide d'installation serveur
│   └── db/
│       └── init.sql                     # Schéma PostgreSQL
│
├── teams/                               # Extension Teams (non versionné sur GitHub)
│   ├── teams-exporter-extension/        # Extension Chrome
│   │   ├── manifest.json                # Configuration extension
│   │   ├── popup.html                   # Interface popup
│   │   ├── popup.js                     # Logique popup
│   │   ├── background.js                # Service worker
│   │   ├── google-apps-script.js        # Script Google Sheets
│   │   └── icons/                       # Icônes extension
│   ├── get-teams-messages.ts            # Script TypeScript
│   └── package.json                     # Dépendances
│
├── start.sh                             # Démarrer le serveur
├── stop.sh                              # Arrêter le serveur
├── status.sh                            # Vérifier la santé
├── .gitignore                           # Fichiers ignorés
└── README.md                            # Cette documentation
```

---

## Installation rapide

### Prérequis

- **Node.js** 18+
- **PostgreSQL** 14+
- **npm** ou **yarn**

### 1. Cloner le projet

```bash
git clone git@github.com:trehorelmarine-cmyk/RNDV_Tools.git
cd RNDV_Tools
```

### 2. Installer les dépendances

```bash
cd server
npm install
```

### 3. Configurer PostgreSQL

```bash
# Créer la base de données
createdb rndv

# Initialiser le schéma
psql -d rndv -f db/init.sql
```

### 4. Configurer l'environnement

```bash
cp .env.example .env
# Éditer .env avec vos paramètres
```

### 5. Démarrer le serveur

```bash
cd ..
./start.sh
```

---

## Applications

### 1. Roadmap Planning

**URL** : http://localhost:3000/roadmap/roadmap.html

Planning interactif de type Gantt pour visualiser et gérer les tâches du projet.

#### Fonctionnalités

- Drag & drop des tâches
- Redimensionnement des tâches
- Édition des tâches (double-clic)
- Sauvegarde en base de données
- 6 catégories de tâches avec couleurs
- Jalons (milestones)
- Récapitulatif des dates de livraison
- Accessible (ARIA, clavier)

#### Catégories

| Catégorie | Couleur |
|-----------|---------|
| PAC | Gris |
| Rapports | Bleu |
| Vente | Vert |
| Billetterie | Jaune |
| PMO | Orange |
| Commercialisation | Violet |

#### Timeline

- **Période** : Décembre 2025 → Janvier 2027
- **Échelle** : 1 mois = 100px

---

### 2. Analyse Demandes RNDV

**URL** : http://localhost:3000/analyse/rapport_evolution.html

Dashboard d'analyse des demandes avec graphiques Chart.js.

#### Fonctionnalités

- Statistiques du jour
- Évolution temporelle
- Répartition par catégorie
- Graphiques interactifs
- Mise à jour automatique

#### Fichiers de données

| Fichier | Description |
|---------|-------------|
| `data_rndv.csv` | Données brutes des demandes |
| `data_chart.json` | Données formatées pour les graphiques |

#### Scripts Python

```bash
# Mettre à jour le dashboard
python update_dashboard.py

# Démarrer un serveur local (port 8000)
python start_server.py
```

---

### 3. Teams Conversation Exporter

Extension Chrome pour exporter les conversations Microsoft Teams.

#### Fonctionnalités

- Export en CSV
- Export vers Google Sheets
- Extraction automatique des messages

#### Installation

1. Ouvrir `chrome://extensions/`
2. Activer "Mode développeur"
3. Cliquer "Charger l'extension non empaquetée"
4. Sélectionner le dossier `teams/teams-exporter-extension/`

---

## Serveur

### Configuration

Le serveur utilise les variables d'environnement suivantes (fichier `.env`) :

| Variable | Description | Défaut |
|----------|-------------|--------|
| `PORT` | Port du serveur | `3000` |
| `DB_HOST` | Hôte PostgreSQL | `localhost` |
| `DB_PORT` | Port PostgreSQL | `5432` |
| `DB_NAME` | Nom de la base | `rndv` |
| `DB_USER` | Utilisateur | `postgres` |
| `DB_PASSWORD` | Mot de passe | - |

### Démarrage

```bash
# Démarrer
./start.sh

# Arrêter
./stop.sh

# Vérifier le statut
./status.sh

# Voir les logs
tail -f server/server.log
```

---

## API

### Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/health` | État du serveur et de la DB |
| `GET` | `/api/tasks` | Liste toutes les tâches |
| `GET` | `/api/tasks/:id` | Récupère une tâche |
| `POST` | `/api/tasks` | Crée une tâche |
| `PUT` | `/api/tasks/:id` | Met à jour une tâche |
| `PATCH` | `/api/tasks/:id/position` | Met à jour la position |
| `DELETE` | `/api/tasks/:id` | Supprime une tâche |
| `POST` | `/api/tasks/bulk` | Sauvegarde toutes les tâches |
| `POST` | `/api/tasks/reset` | Réinitialise les tâches |
| `GET` | `/api/milestones` | Liste les jalons |

### Exemples

```bash
# Vérifier la santé
curl http://localhost:3000/api/health

# Lister les tâches
curl http://localhost:3000/api/tasks

# Créer une tâche
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"id":"task-99","row_name":"vente","name":"Test","type":"vente","left":100,"top":45,"width":100}'

# Mettre à jour la position
curl -X PATCH http://localhost:3000/api/tasks/task-1/position \
  -H "Content-Type: application/json" \
  -d '{"left":200,"width":150}'
```

---

## Scripts

### start.sh

Démarre le serveur Node.js et affiche les informations.

```bash
./start.sh
```

**Affiche :**
- Statut du serveur
- Port et PID
- URLs des applications
- Commandes disponibles

### stop.sh

Arrête proprement le serveur.

```bash
./stop.sh
```

### status.sh

Vérifie la santé de toutes les applications.

```bash
./status.sh
```

**Vérifie :**
- État du serveur
- Connexion à la base de données
- Accessibilité des applications
- Disponibilité des endpoints API

---

## Base de données

### Schéma

#### Table `tasks`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | VARCHAR(50) | Identifiant unique |
| `row_name` | VARCHAR(50) | Catégorie |
| `name` | VARCHAR(255) | Nom de la tâche |
| `type` | VARCHAR(50) | Type visuel |
| `left` | INTEGER | Position X (pixels) |
| `top` | INTEGER | Position Y (pixels) |
| `width` | INTEGER | Largeur (pixels) |
| `info` | TEXT | Description |
| `delivered` | BOOLEAN | Livraison maintenue |
| `priority` | BOOLEAN | Prioritaire |
| `created_at` | TIMESTAMP | Date de création |
| `updated_at` | TIMESTAMP | Date de modification |

#### Table `milestones`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | SERIAL | Identifiant |
| `date` | VARCHAR(10) | Date affichée |
| `label` | VARCHAR(255) | Nom de l'événement |
| `position` | INTEGER | Position X (pixels) |
| `color` | VARCHAR(20) | Couleur (blue/green/red) |
| `level` | INTEGER | Niveau vertical (1-3) |

#### Table `task_history`

Historique des modifications (audit trail).

### Réinitialisation

```bash
# Réinitialiser la base de données
psql -d rndv -f server/db/init.sql
```

---

## Développement

### Mode développement

```bash
cd server
npm run dev  # Avec hot reload
```

### Structure du code

- **server.js** : Serveur Express avec API REST
- **Pattern IIFE** : Module JavaScript encapsulé dans roadmap.html
- **Chart.js** : Graphiques dans le dashboard d'analyse

---

## Compatibilité

- **Navigateurs** : Chrome, Firefox, Safari, Edge (versions modernes)
- **Node.js** : 18+
- **PostgreSQL** : 14+

---

## Licence

Projet propriétaire RNDV.

---

## Auteurs

- RNDV Team
- Comédie-Française
