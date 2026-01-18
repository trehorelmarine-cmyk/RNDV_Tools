# RNDV Roadmap - Documentation Technique

> Planning interactif de type Gantt pour la gestion de projet RNDV - Comédie-Française

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
- Jalons (milestones) avec niveaux de positionnement
- 6 catégories de tâches avec couleurs pastel
- Indicateurs de livraison maintenue et priorité
- Récapitulatif des dates de livraison
- Accessible (ARIA, navigation clavier)

### Timeline

- **Période** : Décembre 2025 → Janvier 2027 (14 mois)
- **Échelle** : 1 mois = 100px

---

## Structure des fichiers

```
Roadmap/
├── roadmap.html          # Application principale (HTML + CSS + JS)
├── Logo_RNDV.png         # Logo affiché dans le header
├── README.md             # Cette documentation
└── .claude/
    └── agents/           # Agents Claude Code
        ├── documentation-expert.md
        ├── frontend-developer.md
        └── fullstack-developer.md
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
| `--rndv-green-light` | `#E6FBF5` | Vert clair |
| `--rndv-red` | `#EA4335` | Rouge (danger/priorité) |
| `--rndv-red-light` | `#FCE8E6` | Rouge clair |
| `--rndv-yellow` | `#FBBC04` | Jaune (à valider) |
| `--rndv-yellow-light` | `#FEF7E0` | Jaune clair |
| **Layout** |||
| `--category-width` | `140px` | Largeur sidebar catégories |
| `--month-width` | `100px` | Largeur d'un mois |
| `--row-height` | `160px` | Hauteur d'une ligne Gantt |
| `--header-height` | `40px` | Hauteur header années |
| **Effets** |||
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.08)` | Ombre légère |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.1)` | Ombre moyenne |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.15)` | Ombre forte |
| `--shadow-primary` | `0 4px 12px rgba(70,48,234,0.3)` | Ombre violette |
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
| `.gantt-header` | Header sticky (milestones + années + mois) |
| `.gantt-content` | Contenu scrollable du Gantt |

#### Catégories (6 catégories)

| Classe | Couleur bordure | Description |
|--------|-----------------|-------------|
| `.category--pac` | `#9CA3AF` (Gris) | PAC |
| `.category--rapports` | `#93C5FD` (Bleu) | Rapports |
| `.category--vente` | `#6EE7B7` (Vert) | Vente |
| `.category--billetterie` | `#FDE68A` (Jaune) | Gestion Billetterie |
| `.category--pmo` | `#FDBA74` (Orange) | PMO |
| `.category--commercialisation` | `#A5B4FC` (Violet) | Commercialisation |

#### Timeline

| Classe | Description |
|--------|-------------|
| `.years-row` | Ligne des années (fond violet) |
| `.year-block` | Bloc année individuel |
| `.months-row` | Ligne des mois |
| `.month` | Cellule mois individuelle |
| `.gantt-row` | Ligne de tâches |
| `.gantt-cell` | Cellule grille (1 mois) |

#### Tâches - Types par catégorie

| Classe | Apparence | Signification |
|--------|-----------|---------------|
| `.task--pac` | Fond gris `#9CA3AF` | PAC - Plein |
| `.task--pac-light` | Fond gris clair, bordure pointillée | PAC - Light |
| `.task--rapports` | Fond bleu `#93C5FD` | Rapports - Plein |
| `.task--rapports-light` | Fond bleu clair, bordure pointillée | Rapports - Light |
| `.task--vente` | Fond vert `#6EE7B7` | Vente - Plein |
| `.task--vente-light` | Fond vert clair, bordure pointillée | Vente - Light |
| `.task--billetterie` | Fond jaune `#FDE68A` | Billetterie - Plein |
| `.task--billetterie-light` | Fond jaune clair, bordure pointillée | Billetterie - Light |
| `.task--pmo` | Fond orange `#FDBA74` | PMO - Plein |
| `.task--pmo-light` | Fond orange clair, bordure pointillée | PMO - Light |
| `.task--commercialisation` | Fond violet `#A5B4FC` | Commercialisation - Plein |
| `.task--commercialisation-light` | Fond violet clair, bordure pointillée | Commercialisation - Light |

#### Indicateurs de tâches

| Classe | Apparence | Signification |
|--------|-----------|---------------|
| `.task--delivered` | Bordure verte `#10B981` | Livraison maintenue |
| `.task--priority` | Bordure rouge `#DC2626` | Prioritaire |

#### États des tâches

| Classe | Description |
|--------|-------------|
| `.task--selected` | État sélectionné (outline violet) |
| `.task--dragging` | État en cours de déplacement |

#### Jalons (Milestones)

| Classe | Description |
|--------|-------------|
| `.milestones-row` | Ligne des jalons dans le header |
| `.milestone-label` | Étiquette du jalon |
| `.milestone-label--level-1/2/3` | Positionnement vertical (3 niveaux) |
| `.milestone-label--blue/green/red` | Couleurs des jalons |
| `.milestone-connector` | Ligne verticale connecteur (header) |
| `.milestones-lines` | Conteneur des lignes dans le content |
| `.milestone-line` | Ligne verticale dans le contenu |
| `.milestone-line--blue/green/red` | Couleurs des lignes |

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

#### Récapitulatif des livraisons

| Classe | Description |
|--------|-------------|
| `.delivery-summary` | Section récapitulative |
| `.delivery-summary__title` | Titre de la section |
| `.delivery-summary__sections` | Grille des sections par catégorie |
| `.delivery-summary__section` | Section individuelle |
| `.delivery-summary__section--[category]` | Variante par catégorie |
| `.delivery-summary__list` | Liste des tâches |
| `.delivery-summary__item` | Item tâche + date |
| `.delivery-summary__task-name` | Nom de la tâche |
| `.delivery-summary__date` | Date de livraison |

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
| `renderDeliverySummary()` | Affiche le récapitulatif des livraisons |
| `positionToDate(position)` | Convertit une position en date |
| `handleTaskMouseDown(e, task)` | Gère le clic sur tâche |
| `handleMouseMove(e)` | Gère le déplacement |
| `handleMouseUp()` | Gère le relâchement |
| `handleTaskKeydown(e, task)` | Gère les raccourcis clavier |
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
│ [Logo RNDV]  │  Roadmap billetterie Comédie-Fr. │
└─────────────────────────────────────────────────┘
```

- Logo : `Logo_RNDV.png` (filtre blanc)
- Titre : "Roadmap billetterie Comédie-Française"

### 2. Toolbar

```
┌─────────────────────────────────────────────────┐
│                    [Sauvegarder]  [Réinitialiser]│
└─────────────────────────────────────────────────┘
```

### 3. Timeline Container

```
┌──────────┬──────────────────────────────────────┐
│          │ Milestones (3 niveaux)               │
│          ├──────────────────────────────────────┤
│          │ 2025 │      2026       │ 2027        │
│ Sidebar  ├──────────────────────────────────────┤
│ Catégor. │ DÉC │ JAN │ FÉV │ ... │ JAN         │
│          ├──────────────────────────────────────┤
│ PAC      │ ████████  ░░░░░  ██████████         │
│ RAPPORTS │ ████  ▒▒▒▒▒  ████████               │
│ VENTE    │ ...                                  │
│ BILLET.  │ ...                                  │
│ PMO      │ ...                                  │
│ COMMERC. │ ...                                  │
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

**Indicateurs visuels :**
- Bordure verte : Livraison maintenue
- Bordure rouge : Prioritaire
- Bordure pointillée : À valider (variante light)

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
│ [PAC - Plein                    ▼] │
│   ├── PAC (Gris)                   │
│   ├── Rapports (Bleu)              │
│   ├── Vente (Vert)                 │
│   ├── Billetterie (Jaune)          │
│   ├── PMO (Orange)                 │
│   └── Commercialisation (Violet)   │
│                                     │
├─────────────────────────────────────┤
│ [Supprimer] [Annuler] [Sauvegarder]│
└─────────────────────────────────────┘
```

### 6. Legend

```
┌─────────────────────────────────────────────────┐
│ 💡 Instructions...  ████ Maintenue  ████ Prio  │
│                     ░░░░ À valider              │
└─────────────────────────────────────────────────┘
```

### 7. Récapitulatif des livraisons

```
┌─────────────────────────────────────────────────┐
│ Récapitulatif des dates de livraison            │
├─────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │ PAC         │ │ RAPPORTS    │ │ VENTE       │ │
│ │ ─────────── │ │ ─────────── │ │ ─────────── │ │
│ │ Tâche1 Date │ │ Tâche1 Date │ │ Tâche1 Date │ │
│ │ Tâche2 Date │ │ Tâche2 Date │ │ Tâche2 Date │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## Données

### Structure d'une tâche

```javascript
{
    id: 'task-1',                    // Identifiant unique
    row: 'pac',                      // Catégorie (pac|rapports|vente|billetterie|pmo|commercialisation)
    name: 'Préparation HLM',         // Nom affiché
    type: 'pac',                     // Type visuel (voir Types de tâches)
    left: 10,                        // Position X en pixels
    top: 45,                         // Position Y en pixels (dans la ligne)
    width: 140,                      // Largeur en pixels
    info: 'Description complète',    // Texte tooltip/info
    delivered: true,                 // (optionnel) Indicateur livraison maintenue
    priority: true                   // (optionnel) Indicateur prioritaire
}
```

### Structure d'un jalon

```javascript
{
    date: '21/01',           // Date affichée
    label: 'BIS Nantes',     // Nom de l'événement
    position: 170,           // Position X en pixels
    color: 'blue',           // Couleur (blue|green|red)
    level: 1                 // Niveau de positionnement (1|2|3)
}
```

### Catégories disponibles (6)

| ID | Nom affiché | Couleur |
|----|-------------|---------|
| `pac` | PAC | Gris |
| `rapports` | RAPPORTS | Bleu |
| `vente` | VENTE | Vert |
| `billetterie` | GESTION BILLETTERIE | Jaune |
| `pmo` | PMO | Orange |
| `commercialisation` | COMMERCIALISATION | Violet |

### Types de tâches (12)

| Type | Apparence | Signification |
|------|-----------|---------------|
| `pac` | Fond gris plein | PAC standard |
| `pac-light` | Fond gris clair, bordure pointillée | PAC à valider |
| `rapports` | Fond bleu plein | Rapports standard |
| `rapports-light` | Fond bleu clair, bordure pointillée | Rapports à valider |
| `vente` | Fond vert plein | Vente standard |
| `vente-light` | Fond vert clair, bordure pointillée | Vente à valider |
| `billetterie` | Fond jaune plein | Billetterie standard |
| `billetterie-light` | Fond jaune clair, bordure pointillée | Billetterie à valider |
| `pmo` | Fond orange plein | PMO standard |
| `pmo-light` | Fond orange clair, bordure pointillée | PMO à valider |
| `commercialisation` | Fond violet plein | Commercialisation standard |
| `commercialisation-light` | Fond violet clair, bordure pointillée | Commercialisation à valider |

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
    type: 'vente',              // Type = catégorie pour couleur pleine
    left: 300,                  // Position (mois 3 = 300px)
    top: 45,                    // Position verticale dans la ligne
    width: 100,                 // Durée 1 mois
    info: 'Description',
    delivered: false,           // Optionnel
    priority: false             // Optionnel
}
```

### Ajouter un nouveau jalon

Dans `MILESTONES`, ajouter :

```javascript
{
    date: '15/04',
    label: 'Événement',
    position: 450,              // Avril 15 ≈ 400 + 50
    color: 'green',             // blue | green | red
    level: 1                    // 1, 2 ou 3 (éviter chevauchement)
}
```

### Ajouter une nouvelle catégorie

1. **HTML** : Ajouter dans `.categories` et `.gantt-content`
2. **CSS** : Créer `.category--nouvelle` et `.task--nouvelle` / `.task--nouvelle-light`
3. **JS** : Ajouter dans le tableau `rows` de `renderTimeline()` et dans `renderDeliverySummary()`

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

### v2.1.0 (Janvier 2026)
- Ajout de la catégorie PAC
- Nouveau système de couleurs par catégorie (pastel)
- Indicateurs visuels "delivered" et "priority"
- Section récapitulatif des dates de livraison
- Jalons avec niveaux de positionnement (évite chevauchement)
- Header sticky pour navigation améliorée

### v2.0.0 (Janvier 2026)
- Refactorisation complète du code
- Ajout accessibilité ARIA
- Pattern Module JavaScript
- Documentation CSS avec variables
- Nomenclature BEM

### v1.0.0
- Version initiale
