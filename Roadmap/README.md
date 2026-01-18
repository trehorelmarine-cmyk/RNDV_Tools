# RNDV Roadmap - Documentation Technique

> Planning interactif de type Gantt pour la gestion de projet RNDV

## Table des matières

- [Aperçu](#aperçu)
- [Structure des fichiers](#structure-des-fichiers)
- [Architecture CSS](#architecture-css)
- [Architecture JavaScript](#architecture-javascript)
- [Composants UI](#composants-ui)
- [Données](#données)
- [API Publique](#api-publique)
- [Personnalisation](#personnalisation)

---

## Aperçu

Application web standalone (HTML unique) permettant de visualiser et manipuler un planning de projet sous forme de diagramme de Gantt interactif.

### Fonctionnalités

- Drag & drop des tâches
- Redimensionnement des tâches (bordures gauche/droite)
- Édition des tâches (double-clic)
- Sauvegarde/chargement localStorage
- Jalons (milestones) avec lignes verticales
- 5 types de tâches visuellement distincts
- Accessible (ARIA, navigation clavier)

### Timeline

- **Période** : Décembre 2025 → Janvier 2027 (14 mois)
- **Échelle** : 1 mois = 100px

---

## Structure des fichiers

```
Roadmap/
├── roadmap.html      # Application principale (HTML + CSS + JS)
├── Logo_RNDV.png     # Logo affiché dans le header
├── README.md         # Cette documentation
└── .claude/
    └── agents/       # Agents Claude Code installés
```

---

## Architecture CSS

### Variables CSS (`:root`)

| Variable | Valeur | Description |
|----------|--------|-------------|
| **Couleurs Brand** |||
| `--rndv-primary` | `#4630EA` | Violet principal |
| `--rndv-primary-light` | `#6B5AED` | Violet clair |
| `--rndv-primary-dark` | `#3425B8` | Violet foncé |
| **Couleurs Neutres** |||
| `--rndv-black` | `#000000` | Noir |
| `--rndv-white` | `#FFFFFF` | Blanc |
| `--rndv-gray-50` | `#F8F9FA` | Gris très clair |
| `--rndv-gray-100` | `#F1F3F4` | Gris clair |
| `--rndv-gray-200` | `#E8EAED` | Gris moyen clair |
| `--rndv-gray-300` | `#DADCE0` | Gris moyen |
| `--rndv-gray-600` | `#5F6368` | Gris foncé |
| **Couleurs Statut** |||
| `--rndv-green` | `#00D9A5` | Vert (livraison maintenue) |
| `--rndv-red` | `#EA4335` | Rouge (danger) |
| `--rndv-yellow` | `#FBBC04` | Jaune (à valider) |
| **Layout** |||
| `--category-width` | `140px` | Largeur sidebar catégories |
| `--month-width` | `100px` | Largeur d'un mois |
| `--row-height` | `160px` | Hauteur d'une ligne Gantt |
| `--header-height` | `40px` | Hauteur header années |
| **Effets** |||
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.08)` | Ombre légère |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.1)` | Ombre moyenne |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.15)` | Ombre forte |
| `--transition-fast` | `0.15s ease` | Transition rapide |
| `--transition-normal` | `0.2s ease` | Transition normale |

### Classes CSS principales

#### Layout

| Classe | Description |
|--------|-------------|
| `.container` | Conteneur principal (max 1800px) |
| `.header` | En-tête violet avec logo |
| `.toolbar` | Barre d'outils avec boutons |
| `.timeline-container` | Conteneur flex du Gantt |
| `.categories` | Sidebar gauche des catégories |
| `.gantt-area` | Zone principale du diagramme |

#### Catégories

| Classe | Description |
|--------|-------------|
| `.category` | Style de base catégorie |
| `.category--rapports` | Bordure verte |
| `.category--vente` | Bordure violette |
| `.category--billetterie` | Bordure bleue |
| `.category--pmo` | Bordure violet clair |
| `.category--commercialisation` | Bordure jaune |

#### Timeline

| Classe | Description |
|--------|-------------|
| `.years-row` | Ligne des années (fond violet) |
| `.year-block` | Bloc année individuel |
| `.months-row` | Ligne des mois |
| `.month` | Cellule mois individuelle |
| `.gantt-row` | Ligne de tâches |
| `.gantt-cell` | Cellule grille (1 mois) |

#### Tâches

| Classe | Description |
|--------|-------------|
| `.task` | Style de base tâche |
| `.task--green` | Livraison maintenue (vert) |
| `.task--red` | Prioritaire (violet primary) |
| `.task--dashed` | À valider (jaune pointillé) |
| `.task--gray` | Préparation (gris) |
| `.task--blue-dashed` | En attente (bleu pointillé) |
| `.task--selected` | État sélectionné |
| `.task--dragging` | État en cours de déplacement |

#### Jalons (Milestones)

| Classe | Description |
|--------|-------------|
| `.temps-forts-row` | Ligne des temps forts |
| `.milestone` | Conteneur jalon |
| `.milestone__diamond` | Losange du jalon |
| `.milestone__label` | Texte du jalon |
| `.milestone__date` | Date en gras |
| `.vline` | Ligne verticale |
| `.vline--blue` / `--green` / `--red` | Couleurs des lignes |
| `.mev-box` | Boîte "Mises en Vente" |

#### UI Components

| Classe | Description |
|--------|-------------|
| `.btn` | Style de base bouton |
| `.btn--primary` | Bouton violet |
| `.btn--secondary` | Bouton gris |
| `.btn--danger` | Bouton rouge |
| `.tooltip` | Infobulle |
| `.position-indicator` | Indicateur de position (drag) |
| `.modal-overlay` | Fond modal |
| `.modal` | Fenêtre modale |
| `.form-group` | Groupe de formulaire |

---

## Architecture JavaScript

### Module `RoadmapApp`

Pattern IIFE (Immediately Invoked Function Expression) avec API publique.

```javascript
const RoadmapApp = (function() {
    // ... code privé
    return {
        init,           // Initialisation
        save,           // Sauvegarde localStorage
        reset,          // Réinitialisation
        closeModal,     // Fermer modal
        saveTaskEdit,   // Sauvegarder édition
        deleteTask      // Supprimer tâche
    };
})();
```

### Configuration (`CONFIG`)

```javascript
const CONFIG = {
    MONTH_WIDTH: 100,        // Largeur d'un mois en pixels
    SNAP_GRID: 20,           // Grille d'accrochage (snap)
    MIN_TASK_WIDTH: 40,      // Largeur minimum tâche
    STORAGE_KEY: 'roadmap-tasks',  // Clé localStorage
    MONTHS: [...],           // Définition des 14 mois
    MONTH_LABELS: [...]      // Labels courts des mois
};
```

### État (`state`)

```javascript
let state = {
    tasks: [],              // Liste des tâches
    selectedTask: null,     // Tâche sélectionnée
    editingTask: null,      // Tâche en cours d'édition
    isDragging: false,      // En cours de drag
    isResizing: false,      // En cours de resize
    resizeDirection: null,  // 'left' ou 'right'
    dragStartX: 0,          // Position X initiale
    taskStartLeft: 0,       // Position left initiale
    taskStartWidth: 0,      // Largeur initiale
    currentFilter: 'all',   // Filtre année
    currentOffset: 0        // Offset pour filtrage
};
```

### Fonctions principales

| Fonction | Description |
|----------|-------------|
| `init()` | Initialise l'application |
| `cacheElements()` | Met en cache les éléments DOM |
| `renderTimeline(year)` | Affiche la timeline |
| `renderTasks()` | Affiche les tâches |
| `renderMilestones()` | Affiche les jalons |
| `handleTaskMouseDown(e, task)` | Gère le clic sur tâche |
| `handleMouseMove(e)` | Gère le déplacement |
| `handleMouseUp()` | Gère le relâchement |
| `showTooltip(e, task)` | Affiche l'infobulle |
| `hideTooltip()` | Cache l'infobulle |
| `showPositionIndicator(e, left, width)` | Affiche l'indicateur |
| `openEditModal(task)` | Ouvre le modal d'édition |
| `closeModal()` | Ferme le modal |
| `saveTaskEdit()` | Sauvegarde l'édition |
| `deleteTask()` | Supprime la tâche |
| `save()` | Sauvegarde en localStorage |
| `load()` | Charge depuis localStorage |
| `reset()` | Réinitialise les données |

---

## Composants UI

### 1. Header

```
┌─────────────────────────────────────────────────┐
│ [Logo RNDV]  │  Planning                        │
└─────────────────────────────────────────────────┘
```

- Logo : `Logo_RNDV.png` (filtre blanc)
- Titre : "Planning"

### 2. Toolbar

```
┌─────────────────────────────────────────────────┐
│ [Sauvegarder]  [Réinitialiser]                  │
└─────────────────────────────────────────────────┘
```

### 3. Timeline Container

```
┌──────────┬──────────────────────────────────────┐
│          │ Temps Forts (milestones)             │
│          ├──────────────────────────────────────┤
│          │ 2025 │      2026       │ 2027        │
│ Sidebar  ├──────────────────────────────────────┤
│ Catégor. │ DÉC │ JAN │ FÉV │ ... │ JAN         │
│          ├──────────────────────────────────────┤
│ RAPPORTS │ ████████  ░░░░░  ██████████         │
│ VENTE    │ ████  ▒▒▒▒▒  ████████               │
│ ...      │ ...                                  │
└──────────┴──────────────────────────────────────┘
```

### 4. Tâche (Task)

```
┌─────────────────────────────────────┐
│ ║  Nom de la tâche                ║ │
└─────────────────────────────────────┘
  ↑                                  ↑
  Resize handle gauche       Resize handle droite
```

**Interactions :**
- **Drag** : Clic + glisser sur le corps
- **Resize** : Clic + glisser sur les bordures
- **Édition** : Double-clic
- **Clavier** : Tab pour naviguer, Enter/Space pour éditer

### 5. Modal d'édition

```
┌─────────────────────────────────────┐
│ Modifier la tâche                   │
├─────────────────────────────────────┤
│ Nom de la tâche                     │
│ [________________________]          │
│                                     │
│ Description                         │
│ [________________________]          │
│                                     │
│ Type                                │
│ [Livraison maintenue (vert)    ▼]  │
│                                     │
├─────────────────────────────────────┤
│ [Supprimer] [Annuler] [Sauvegarder]│
└─────────────────────────────────────┘
```

### 6. Legend

```
┌─────────────────────────────────────────────────┐
│ 💡 Instructions...  ████ Maintenue  ████ Prio  │
└─────────────────────────────────────────────────┘
```

---

## Données

### Structure d'une tâche

```javascript
{
    id: 'task-1',                    // Identifiant unique
    row: 'rapports',                 // Catégorie (rapports|vente|billetterie|pmo|commercialisation)
    name: 'Préparation HLM',         // Nom affiché
    type: 'gray',                    // Type visuel (green|red|dashed|gray|blue-dashed)
    left: 10,                        // Position X en pixels
    top: 12,                         // Position Y en pixels (dans la ligne)
    width: 140,                      // Largeur en pixels
    info: 'Description complète'     // Texte tooltip/info
}
```

### Structure d'un jalon

```javascript
{
    date: '21/01',           // Date affichée
    label: 'BIS Nantes',     // Nom de l'événement
    position: 170,           // Position X en pixels
    color: 'blue'            // Couleur (blue|green|red)
}
```

### Catégories disponibles

| ID | Nom affiché |
|----|-------------|
| `rapports` | RAPPORTS PAC |
| `vente` | VENTE |
| `billetterie` | GESTION BILLETTERIE |
| `pmo` | PMO |
| `commercialisation` | COMMERCIALISATION |

### Types de tâches

| Type | Apparence | Signification |
|------|-----------|---------------|
| `green` | Fond vert plein | Livraison maintenue |
| `red` | Fond violet plein | Prioritaire |
| `dashed` | Fond jaune, bordure pointillée | À valider |
| `gray` | Fond gris | Préparation |
| `blue-dashed` | Fond bleu clair, bordure pointillée | En attente |

---

## API Publique

### `RoadmapApp.init()`

Initialise l'application. Appelée automatiquement au chargement.

### `RoadmapApp.save()`

Sauvegarde l'état actuel des tâches dans localStorage.

```javascript
// Appelé par le bouton "Sauvegarder"
RoadmapApp.save();
```

### `RoadmapApp.reset()`

Réinitialise toutes les tâches à leur position initiale.

```javascript
// Appelé par le bouton "Réinitialiser"
RoadmapApp.reset();
```

### `RoadmapApp.closeModal()`

Ferme le modal d'édition.

### `RoadmapApp.saveTaskEdit()`

Sauvegarde les modifications du modal.

### `RoadmapApp.deleteTask()`

Supprime la tâche en cours d'édition.

---

## Personnalisation

### Ajouter une nouvelle tâche

Dans `INITIAL_TASKS`, ajouter :

```javascript
{
    id: 'task-34',              // ID unique
    row: 'vente',               // Catégorie
    name: 'Nouvelle tâche',
    type: 'green',
    left: 300,                  // Position (mois 3 = 300px)
    top: 12,                    // Première ligne de la catégorie
    width: 100,                 // Durée 1 mois
    info: 'Description'
}
```

### Ajouter un nouveau jalon

Dans `MILESTONES`, ajouter :

```javascript
{
    date: '15/04',
    label: 'Événement',
    position: 450,              // Avril 15 ≈ 400 + 50
    color: 'green'
}
```

### Ajouter une nouvelle catégorie

1. **HTML** : Ajouter dans `.categories` et `.gantt-area`
2. **CSS** : Créer `.category--nouvelle`
3. **JS** : Ajouter dans le tableau `rows` de `renderTimeline()`

### Modifier la période

Dans `CONFIG.MONTHS`, modifier le tableau des mois.

---

## Raccourcis clavier

| Touche | Action |
|--------|--------|
| `Tab` | Naviguer entre les tâches |
| `Enter` / `Space` | Ouvrir l'éditeur de tâche |
| `Escape` | Fermer le modal |

---

## Compatibilité

- **Navigateurs** : Chrome, Firefox, Safari, Edge (versions modernes)
- **Responsive** : Scroll horizontal sur petits écrans
- **Accessibilité** : WCAG 2.1 niveau AA

---

## Changelog

### v2.0.0 (Janvier 2026)
- Refactorisation complète du code
- Ajout accessibilité ARIA
- Pattern Module JavaScript
- Documentation CSS avec variables
- Nomenclature BEM

### v1.0.0
- Version initiale
