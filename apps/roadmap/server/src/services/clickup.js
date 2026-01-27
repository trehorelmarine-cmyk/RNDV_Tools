/**
 * ClickUp API Service
 * Service pour récupérer les tâches depuis ClickUp et les transformer pour la Roadmap
 */

import fetch from 'node-fetch'

const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN
const FOLDER_ID = '90127901348'

// Mapping des listes ClickUp vers les catégories Roadmap
const LIST_TO_CATEGORY = {
  '901213404246': 'rapports',         // RAPPORTS
  '901215431029': 'vente',            // VENTE
  '901215431027': 'billetterie',      // GESTION BILLETTERIE
  '901215372366': 'pac',              // PAC
  '901215372371': 'pmo',              // PMO
  '901215372381': 'commercialisation' // COMMERCIALISATION
}

// Headers pour l'API ClickUp
function getHeaders() {
  return {
    'Authorization': CLICKUP_TOKEN,
    'Content-Type': 'application/json'
  }
}

// Largeur d'un mois en pixels (doit correspondre à CONFIG.MONTH_WIDTH côté frontend)
const MONTH_WIDTH = 150

/**
 * Convertit un timestamp ClickUp en position sur la roadmap
 * Base: 1er décembre 2025 = position 0, 200px par mois
 * Calcul basé sur les mois calendaires réels
 * @param {string} timestamp - Timestamp ClickUp en millisecondes
 * @param {boolean} isEndDate - Si true, calcule la position à la FIN du jour (pour les due dates)
 */
function dateToPosition(timestamp, isEndDate = false) {
  if (!timestamp) return null

  const baseYear = 2025
  const baseMonth = 11 // Décembre (0-indexed)
  const taskDate = new Date(parseInt(timestamp))

  const taskYear = taskDate.getFullYear()
  const taskMonth = taskDate.getMonth()
  const taskDay = taskDate.getDate()

  // Calculer le nombre de mois complets depuis décembre 2025
  const monthsDiff = (taskYear - baseYear) * 12 + (taskMonth - baseMonth)

  // Calculer la position dans le mois actuel (proportion du mois)
  const daysInMonth = new Date(taskYear, taskMonth + 1, 0).getDate()
  // Pour une date de début: position au DÉBUT du jour
  // Pour une date de fin: position à la FIN du jour
  const dayProgress = isEndDate ? taskDay / daysInMonth : (taskDay - 1) / daysInMonth

  // Position = mois complets * largeur + progression dans le mois
  const position = (monthsDiff + dayProgress) * MONTH_WIDTH

  return Math.max(0, Math.round(position))
}

/**
 * Formate un timestamp en date lisible (JJ/MM)
 */
function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = new Date(parseInt(timestamp))
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}

/**
 * Génère la liste des mois à partir d'un nombre de mois nécessaires
 */
function generateMonthsFromCount(count) {
  const MONTH_NAMES = ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOUT', 'SEP', 'OCT', 'NOV', 'DEC']
  const months = []

  let currentDate = new Date(2025, 11, 1) // Décembre 2025

  for (let i = 0; i < count; i++) {
    const monthIndex = currentDate.getMonth()
    const year = currentDate.getFullYear()
    months.push({
      name: MONTH_NAMES[monthIndex],
      year: year
    })
    currentDate.setMonth(currentDate.getMonth() + 1)
  }

  return months
}

/**
 * Détermine le type de milestone selon les tags ClickUp
 * - "temps forts" → type 'temps-fort' (rouge)
 * - "événement" → type 'evenement' (couleur commercialisation, hachuré)
 */
function getMilestoneType(tags) {
  const tagNames = tags.map(t => t.name?.toLowerCase() || '')

  if (tagNames.includes('temps forts') || tagNames.includes('temps fort')) {
    return 'temps-fort'
  }
  if (tagNames.includes('événement') || tagNames.includes('evenement')) {
    return 'evenement'
  }
  return 'default'
}

// Constantes pour le positionnement
const TASK_VERTICAL_GAP = 8
const TASK_HORIZONTAL_GAP = 1
const ROW_PADDING_TOP = 5
const MIN_TASK_WIDTH = 40 // Largeur minimum pour les tâches très courtes
const CHAR_WIDTH = 6 // Largeur moyenne d'un caractère (font 10px)
const TASK_PADDING_H = 12 // Padding horizontal total
const LINE_HEIGHT = 13 // Hauteur d'une ligne de texte
const TASK_PADDING_V = 8 // Padding vertical total

/**
 * Calcule le nombre de lignes nécessaires pour afficher le texte
 */
function calculateLinesNeeded(text, availableWidth) {
  const charsPerLine = Math.max(1, Math.floor((availableWidth - TASK_PADDING_H) / CHAR_WIDTH))
  return Math.ceil(text.length / charsPerLine)
}

/**
 * Calcule la hauteur de tâche nécessaire pour un nombre de lignes
 */
function calculateTaskHeight(lines) {
  return (lines * LINE_HEIGHT) + TASK_PADDING_V
}

/**
 * Vérifie si une tâche a un tag spécifique
 */
function hasTag(task, tagName) {
  const tags = task.tags || []
  return tags.some(t => t.name?.toLowerCase() === tagName.toLowerCase())
}

/**
 * Transforme une tâche ClickUp au format Roadmap (sans position top)
 */
function transformTask(task) {
  const category = LIST_TO_CATEGORY[task.list.id]
  const left = dateToPosition(task.start_date) || 0
  const endPos = dateToPosition(task.due_date, true) || left + 100

  // Vérifier les tags
  const isEvenement = hasTag(task, 'événement') || hasTag(task, 'evenement')
  const isTempsFort = hasTag(task, 'temps forts') || hasTag(task, 'temps fort')

  // Les "temps forts" sont des milestones (affichés en haut)
  const isMilestone = isTempsFort && task.start_date && task.due_date && task.start_date === task.due_date

  // Les "événements" sont affichés avec une étoile dans commercialisation
  // Ils ne sont ni des tâches normales, ni des milestones

  // Largeur basée uniquement sur les dates (représentation visuelle fidèle à la durée)
  const dateWidth = Math.max(MIN_TASK_WIDTH, endPos - left)
  const width = isMilestone ? 2 : dateWidth

  // Vérifier si la livraison est maintenue au planning initial (étiquette ClickUp)
  const isDeliveryMaintained = hasTag(task, 'livraison maintenue au planning')

  return {
    id: task.id,
    name: task.name,
    row: category,
    type: category,
    left: left,
    width: width,
    top: 0,
    delivered: isDeliveryMaintained,
    priority: task.priority?.priority === 'urgent',
    clickupUrl: task.url,
    dueDate: task.due_date ? parseInt(task.due_date) : null,
    status: task.status?.status?.toLowerCase() || '',
    // Types spéciaux
    isEvenement: isEvenement,
    isMilestone: isMilestone,
    milestoneDate: (isMilestone || isEvenement) ? formatDate(task.due_date) : null,
    milestoneType: isMilestone ? 'temps-fort' : null
  }
}

/**
 * Vérifie si deux tâches se chevauchent ou sont trop proches (moins de 1px d'écart)
 */
function tasksOverlapOrTooClose(task1, task2) {
  const end1 = task1.left + task1.width
  const end2 = task2.left + task2.width
  // Chevauchement ou moins de 1px d'écart
  return task1.left < end2 + TASK_HORIZONTAL_GAP && task2.left < end1 + TASK_HORIZONTAL_GAP
}

/**
 * Place les tâches d'une catégorie sans superposition et centrées verticalement
 */
function placeTasks(tasks, taskHeight) {
  if (tasks.length === 0) return { tasks: [], rowHeight: 60 }

  // Trier par date de fin (la plus lointaine en dernier)
  const sortedTasks = [...tasks].sort((a, b) => (a.left + a.width) - (b.left + b.width))

  // Liste des tâches déjà placées avec leurs positions
  const placedTasks = []

  for (const task of sortedTasks) {
    let top = 0
    let placed = false

    while (!placed) {
      // Vérifier si cette position est libre (avec 1px d'écart minimum)
      let hasCollision = false

      for (const placedTask of placedTasks) {
        // Vérifier seulement les tâches sur la même ligne (même top)
        if (placedTask.top === top) {
          if (tasksOverlapOrTooClose(task, placedTask)) {
            hasCollision = true
            break
          }
        }
      }

      if (hasCollision) {
        // Passer à la ligne suivante
        top += taskHeight + TASK_VERTICAL_GAP
      } else {
        // Position trouvée
        task.top = top
        placed = true
      }
    }

    placedTasks.push(task)
  }

  // Calculer la hauteur totale utilisée par les tâches
  const maxTop = placedTasks.reduce((max, t) => Math.max(max, t.top), 0)
  const totalTasksHeight = maxTop + taskHeight

  // Hauteur de la ligne avec padding minimal
  const minPadding = 10
  const calculatedRowHeight = totalTasksHeight + (minPadding * 2)

  // Calculer l'offset pour centrer verticalement les tâches dans la ligne
  const verticalOffset = minPadding

  // Appliquer l'offset à toutes les tâches pour les centrer
  for (const task of placedTasks) {
    task.top += verticalOffset
  }

  return { tasks: placedTasks, rowHeight: calculatedRowHeight }
}

/**
 * Récupère les tâches d'une liste ClickUp
 */
async function fetchListTasks(listId) {
  const url = `https://api.clickup.com/api/v2/list/${listId}/task?subtasks=false`

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders()
  })

  if (!response.ok) {
    throw new Error(`ClickUp API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data.tasks || []
}

/**
 * Récupère les listes du dossier Roadmap
 */
async function fetchFolderLists() {
  const url = `https://api.clickup.com/api/v2/folder/${FOLDER_ID}/list`

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders()
  })

  if (!response.ok) {
    throw new Error(`ClickUp API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data.lists || []
}

/**
 * Assigne des niveaux et offsets aux milestones pour éviter le chevauchement des labels
 * Les lignes restent à leur position exacte, seuls les labels sont décalés
 */
function assignMilestoneLevels(milestones, todayPosition = null) {
  // Trier par position
  const sorted = [...milestones].sort((a, b) => a.left - b.left)

  // Largeur approximative d'un label de milestone (en pixels)
  const LABEL_WIDTH = 130
  const MIN_GAP = 10

  // Ajouter "aujourd'hui" comme un élément virtuel pour le calcul
  const allItems = [...sorted]
  if (todayPosition !== null) {
    allItems.push({ left: todayPosition, isToday: true })
    allItems.sort((a, b) => a.left - b.left)
  }

  // Niveaux utilisés avec leur position de fin (position + largeur du label)
  const levels = [0, 0, 0] // 3 niveaux disponibles

  for (const item of allItems) {
    // Trouver le premier niveau disponible
    let assignedLevel = 0
    for (let i = 0; i < levels.length; i++) {
      if (item.left >= levels[i]) {
        assignedLevel = i + 1
        levels[i] = item.left + LABEL_WIDTH + MIN_GAP
        break
      }
    }
    item.level = assignedLevel || 1
  }

  // Extraire le niveau de "aujourd'hui" et retourner les milestones
  const todayLevel = allItems.find(i => i.isToday)?.level || 3
  const milestonesOnly = allItems.filter(i => !i.isToday)

  return { milestones: milestonesOnly, todayLevel }
}

/**
 * Récupère toutes les tâches du dossier Roadmap
 */
export async function fetchAllTasks() {
  // Récupérer les listes du dossier dans l'ordre ClickUp
  const folderLists = await fetchFolderLists()

  // Construire les catégories ordonnées depuis ClickUp
  const orderedCategories = folderLists
    .filter(list => LIST_TO_CATEGORY[list.id])
    .map(list => ({
      id: LIST_TO_CATEGORY[list.id],
      name: list.name.toUpperCase()
    }))

  // Liste des IDs de listes à récupérer (dans l'ordre ClickUp)
  const listIds = orderedCategories.map(cat => {
    return Object.entries(LIST_TO_CATEGORY).find(([, v]) => v === cat.id)?.[0]
  }).filter(Boolean)

  // Récupérer les tâches de chaque liste en parallèle
  const tasksPromises = listIds.map(listId => fetchListTasks(listId))
  const tasksArrays = await Promise.all(tasksPromises)

  // Grouper les tâches par catégorie (séparant milestones, événements et tâches normales)
  const tasksByCategory = {}
  const allMilestones = []
  const allEvenements = []
  const pastDeliveries = [] // Tâches livrées avant décembre 2025
  let latestEndDate = new Date(2025, 11, 1) // Minimum: décembre 2025
  const roadmapStartDate = new Date(2025, 11, 1) // 1er décembre 2025

  tasksArrays.forEach((tasks, arrayIndex) => {
    const listId = listIds[arrayIndex]
    const category = LIST_TO_CATEGORY[listId]

    if (!tasksByCategory[category]) {
      tasksByCategory[category] = []
    }

    tasks.forEach(task => {
      if (task.due_date) {
        const dueDate = new Date(parseInt(task.due_date))

        // Tâches qui se terminent avant décembre 2025 → pastDeliveries
        if (dueDate < roadmapStartDate) {
          // Ajouter aux livraisons passées (pour le récapitulatif)
          const day = String(dueDate.getDate()).padStart(2, '0')
          const month = String(dueDate.getMonth() + 1).padStart(2, '0')
          const year = dueDate.getFullYear()
          pastDeliveries.push({
            id: task.id,
            name: task.name,
            row: category,
            endDate: `${day}/${month}/${year}`,
            endTimestamp: parseInt(task.due_date),
            status: task.status?.status?.toLowerCase() || ''
          })
          return
        }

        // Tracker la date de fin la plus tardive
        if (dueDate > latestEndDate) {
          latestEndDate = dueDate
        }
      }

      const transformedTask = transformTask(task)

      if (transformedTask.isMilestone) {
        allMilestones.push(transformedTask)
      } else if (transformedTask.isEvenement) {
        // Les événements vont dans commercialisation avec une étoile
        allEvenements.push({
          ...transformedTask,
          row: 'commercialisation'
        })
      } else {
        tasksByCategory[category].push(transformedTask)
      }
    })
  })

  // Calculer la hauteur uniforme pour toutes les tâches
  // Basée sur la tâche nécessitant le plus de lignes
  let maxLinesNeeded = 1
  const allTasksFlat = Object.values(tasksByCategory).flat()

  for (const task of allTasksFlat) {
    const lines = calculateLinesNeeded(task.name, task.width)
    if (lines > maxLinesNeeded) {
      maxLinesNeeded = lines
    }
  }

  // Limiter à 3 lignes maximum pour éviter des tâches trop hautes
  maxLinesNeeded = Math.min(maxLinesNeeded, 3)
  const uniformTaskHeight = calculateTaskHeight(maxLinesNeeded)

  // Positionner les événements EN HAUT de la section commercialisation
  const EVENT_HEIGHT = 24
  const EVENT_GAP = 4
  const EVENT_TOP_PADDING = 8

  // Trier les événements par date
  const sortedEvenements = [...allEvenements].sort((a, b) => a.left - b.left)

  let eventTop = EVENT_TOP_PADDING
  for (const event of sortedEvenements) {
    event.top = eventTop
    eventTop += EVENT_HEIGHT + EVENT_GAP
  }

  // Calculer l'espace utilisé par les événements
  const eventsHeight = sortedEvenements.length > 0 ? eventTop + EVENT_GAP : 0

  // Placer les tâches de chaque catégorie sans superposition
  const allTasks = []
  const categoryHeights = {}

  for (const category of Object.keys(tasksByCategory)) {
    // Pour commercialisation, décaler les tâches sous les événements
    const verticalOffset = category === 'commercialisation' ? eventsHeight : 0
    const { tasks: placedTasks, rowHeight } = placeTasks(tasksByCategory[category], uniformTaskHeight)

    // Appliquer le décalage vertical pour commercialisation
    if (verticalOffset > 0) {
      for (const task of placedTasks) {
        task.top += verticalOffset
      }
    }

    allTasks.push(...placedTasks)
    categoryHeights[category] = rowHeight + verticalOffset
  }

  // S'assurer que toutes les catégories ont une hauteur minimum
  for (const cat of orderedCategories.map(c => c.id)) {
    if (!categoryHeights[cat]) {
      categoryHeights[cat] = cat === 'commercialisation' && sortedEvenements.length > 0
        ? eventsHeight + 60
        : 60 // Hauteur minimum si pas de tâches
    }
  }

  // Calculer la position du jour actuel (même logique que dateToPosition)
  const today = new Date()
  const baseYear = 2025
  const baseMonth = 11 // Décembre
  const monthsDiff = (today.getFullYear() - baseYear) * 12 + (today.getMonth() - baseMonth)
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const dayProgress = (today.getDate() - 1) / daysInMonth
  const todayPosition = Math.max(0, Math.round((monthsDiff + dayProgress) * MONTH_WIDTH))

  // Assigner les niveaux aux milestones et à "aujourd'hui"
  const { milestones: milestonesWithLevels, todayLevel } = assignMilestoneLevels(allMilestones, todayPosition)

  // Calculer la position de fin la plus tardive (incluant la largeur des tâches)
  let maxEndPosition = 0
  for (const task of allTasks) {
    const endPosition = task.left + task.width
    if (endPosition > maxEndPosition) {
      maxEndPosition = endPosition
    }
  }
  // Inclure aussi les milestones et événements
  for (const m of milestonesWithLevels) {
    if (m.left > maxEndPosition) maxEndPosition = m.left
  }
  for (const e of sortedEvenements) {
    if (e.left > maxEndPosition) maxEndPosition = e.left
  }

  // Calculer le nombre de mois nécessaires pour couvrir toutes les tâches
  const monthsNeeded = Math.ceil(maxEndPosition / MONTH_WIDTH) + 1

  // Générer la liste des mois dynamiquement
  const months = generateMonthsFromCount(monthsNeeded)

  // Trier les livraisons passées par date
  const sortedPastDeliveries = pastDeliveries.sort((a, b) => a.endTimestamp - b.endTimestamp)

  return {
    tasks: allTasks,
    milestones: milestonesWithLevels,
    evenements: sortedEvenements,
    pastDeliveries: sortedPastDeliveries,
    categories: orderedCategories,
    categoryHeights,
    taskHeight: uniformTaskHeight,
    todayPosition,
    todayLevel,
    months
  }
}

/**
 * Teste la connexion à l'API ClickUp
 */
export async function testConnection() {
  try {
    const lists = await fetchFolderLists()
    return {
      success: true,
      listsFound: lists.length,
      lists: lists.map(l => ({ id: l.id, name: l.name }))
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
