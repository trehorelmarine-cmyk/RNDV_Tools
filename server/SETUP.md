# Installation du serveur RNDV

## Prérequis

- Node.js 18+
- PostgreSQL 14+

## Installation

### 1. Installer PostgreSQL (macOS)

```bash
# Via Homebrew
brew install postgresql@16
brew services start postgresql@16

# Ajouter au PATH (dans ~/.zshrc ou ~/.bashrc)
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
```

### 2. Créer la base de données

```bash
# Créer la base de données
createdb rndv

# Initialiser le schéma et les données
psql -d rndv -f db/init.sql
```

### 3. Configurer l'environnement

```bash
# Copier le fichier de configuration
cp .env.example .env

# Éditer les variables si nécessaire
nano .env
```

### 4. Installer les dépendances

```bash
npm install
```

### 5. Démarrer le serveur

```bash
# Mode production
npm start

# Mode développement (avec hot reload)
npm run dev
```

## URLs des applications

Une fois le serveur démarré sur le port 3000 :

| Application | URL |
|-------------|-----|
| **Roadmap** | http://localhost:3000/roadmap/roadmap.html |
| **Analyse** | http://localhost:3000/analyse/rapport_evolution.html |
| **API Health** | http://localhost:3000/api/health |

## API Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/tasks` | Liste toutes les tâches |
| GET | `/api/tasks/:id` | Récupère une tâche |
| POST | `/api/tasks` | Crée une tâche |
| PUT | `/api/tasks/:id` | Met à jour une tâche |
| PATCH | `/api/tasks/:id/position` | Met à jour la position |
| DELETE | `/api/tasks/:id` | Supprime une tâche |
| POST | `/api/tasks/bulk` | Sauvegarde toutes les tâches |
| POST | `/api/tasks/reset` | Réinitialise les tâches |
| GET | `/api/milestones` | Liste les jalons |
| GET | `/api/health` | État du serveur |

## Dépannage

### Erreur de connexion PostgreSQL

Vérifiez que PostgreSQL est démarré :
```bash
brew services list | grep postgresql
```

### Port déjà utilisé

Changez le port dans `.env` :
```
PORT=3001
```
