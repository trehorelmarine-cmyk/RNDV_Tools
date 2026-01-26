# RNDV Tools - Suite d'outils France TV (Comedie-Francaise)

Suite d'outils internes R&D Vente pour la gestion de projet.

## Applications

| Application | Description | Ports |
|-------------|-------------|-------|
| **Dashboard** | Analyse des incidents billetterie (Google Sheets) | Client: 5173, Server: 3001 |
| **Roadmap** | Roadmap Gantt avec integration ClickUp | Client: 5174, Server: 3002 |
| **Spectacles** | Planning spectacles saison 2025/2026 | Client: 5175, Server: 3003 |
| **Gateway** | Landing page avec acces aux applications | Port: 3005 |
| **Teams** | Integration Microsoft Teams + Chrome extension | - |

## Structure du projet

```
RNDV_Tools/
├── packages/
│   └── shared/                 # Code partage entre apps (@rndv/shared)
│       └── src/
│           ├── constants/      # Couleurs, config
│           ├── utils/          # Utilitaires
│           └── components/     # SharedNav
├── apps/
│   ├── gateway/                # Landing page + routing
│   ├── dashboard/              # Analyse tickets support
│   │   ├── client/             # React frontend
│   │   └── server/             # Express backend
│   ├── roadmap/                # Roadmap ClickUp
│   │   ├── client/             # React frontend
│   │   └── server/             # Express backend
│   ├── spectacles/             # Planning spectacles
│   │   ├── client/             # React frontend
│   │   └── server/             # Express backend
│   └── teams/                  # Integration MS Teams
├── .claude/                    # Agents et skills Claude Code
│   ├── agents/                 # 8 agents personnalises
│   └── skills/                 # senior-backend, code-reviewer
├── database/                   # Scripts d'initialisation PostgreSQL
├── docker-compose.yml          # PostgreSQL (dev)
├── docker-compose.prod.yml     # Stack complete (production)
├── .env                        # Variables d'environnement
└── package.json                # Monorepo (npm workspaces)
```

## Demarrage rapide

```bash
# 1. Installer les dependances
npm run install:all

# 2. Demarrer PostgreSQL
npm run db:start

# 3. Demarrer toutes les applications
npm run dev
```

Acceder a la landing page: http://localhost:3005

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Demarre toutes les applications en parallele |
| `npm run dev:gateway` | Demarre uniquement le gateway |
| `npm run dev:dashboard:server` | Demarre le serveur Dashboard |
| `npm run dev:dashboard:client` | Demarre le client Dashboard |
| `npm run dev:roadmap:server` | Demarre le serveur Roadmap |
| `npm run dev:roadmap:client` | Demarre le client Roadmap |
| `npm run dev:spectacles:server` | Demarre le serveur Spectacles |
| `npm run dev:spectacles:client` | Demarre le client Spectacles |
| `npm run db:start` | Demarre PostgreSQL via Docker |
| `npm run db:stop` | Arrete PostgreSQL |
| `npm run db:reset` | Reinitialise la base de donnees |
| `npm run install:all` | Installe les dependances |

## Stack technique

### Frontend
- React + Vite
- CSS avec variables CSS
- Chart.js pour les graphiques (Dashboard)
- html2canvas pour l'export PNG (Roadmap)

### Backend
- Node.js + Express
- PostgreSQL pour la base de donnees

### Integration
- ClickUp API (Roadmap)
- Google Sheets CSV (Dashboard)
- Microsoft Teams / Graph API (Teams)

## Variables d'environnement

```env
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# ClickUp (optionnel)
CLICKUP_API_TOKEN=pk_xxxxxxxxxxxxx

# Google Sheets (optionnel)
GOOGLE_SHEET_ID=your_spreadsheet_id

# Ports
GATEWAY_PORT=3005
DASHBOARD_PORT=3001
ROADMAP_PORT=3002
SPECTACLES_PORT=3003
```

## Conventions de code

### Langue
- Interface utilisateur: Francais
- Code et commentaires: Anglais
- Messages de commit: Anglais

### Naming
- Composants React: PascalCase (ex: `Dashboard.jsx`)
- CSS: `ComponentName.css`
- Services: camelCase (ex: `clickupService.js`)

## Deploiement

```bash
# Deployer sur le serveur distant
./deploy-remote.sh deploy

# Verifier le statut
./deploy-remote.sh status
```
