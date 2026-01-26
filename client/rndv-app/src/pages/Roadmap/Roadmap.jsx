import { useState, useEffect, useRef } from 'react'
import html2canvas from 'html2canvas'
import './Roadmap.css'

// Configuration
const CONFIG = {
  MONTH_WIDTH: 150,
  SNAP_GRID: 20,
  MIN_TASK_WIDTH: 40,
  API_URL: 'http://localhost:3001'
}

// Mois par défaut (sera remplacé par les données de l'API)
const DEFAULT_MONTHS = [
  { name: 'DEC', year: 2025 }
]

const CATEGORIES = [
  { id: 'pac', name: 'PAC' },
  { id: 'rapports', name: 'RAPPORTS' },
  { id: 'vente', name: 'VENTE' },
  { id: 'billetterie', name: 'GESTION BILLETTERIE' },
  { id: 'pmo', name: 'PMO' },
  { id: 'commercialisation', name: 'COMMERCIALISATION' }
]

// Fonction utilitaire pour obtenir la position du jour actuel
function getTodayPosition() {
  const baseYear = 2025
  const baseMonth = 11 // Décembre
  const today = new Date()
  const monthsDiff = (today.getFullYear() - baseYear) * 12 + (today.getMonth() - baseMonth)
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const dayProgress = (today.getDate() - 1) / daysInMonth
  return Math.max(0, Math.round((monthsDiff + dayProgress) * CONFIG.MONTH_WIDTH))
}

// Fonction utilitaire pour convertir une position en date (en toutes lettres)
function positionToDate(position) {
  const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

  // Position 0 = 1er décembre 2025
  const monthsFromBase = position / CONFIG.MONTH_WIDTH
  const fullMonths = Math.floor(monthsFromBase)
  const monthProgress = monthsFromBase - fullMonths

  // Calculer le mois et l'année
  const baseYear = 2025
  const baseMonth = 11 // Décembre
  const totalMonths = baseMonth + fullMonths
  const year = baseYear + Math.floor(totalMonths / 12)
  const month = totalMonths % 12

  // Calculer le jour dans le mois
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const day = Math.min(Math.max(1, Math.round(monthProgress * daysInMonth) + 1), daysInMonth)

  const monthName = MONTH_NAMES[month]
  // Utiliser "1er" pour le premier jour du mois
  const dayStr = day === 1 ? '1er' : day
  return `${dayStr} ${monthName} ${year}`
}

// Hauteurs par défaut des catégories
const DEFAULT_CATEGORY_HEIGHTS = {
  pac: 100,
  rapports: 100,
  vente: 100,
  billetterie: 100,
  pmo: 100,
  commercialisation: 100
}

function Roadmap() {
  const [tasks, setTasks] = useState([])
  const [originalTasks, setOriginalTasks] = useState([]) // Positions originales ClickUp
  const [milestones, setMilestones] = useState([])
  const [evenements, setEvenements] = useState([])
  const [pastDeliveries, setPastDeliveries] = useState([]) // Livraisons avant décembre 2025
  const [categoryHeights, setCategoryHeights] = useState(DEFAULT_CATEGORY_HEIGHTS)
  const [taskHeight, setTaskHeight] = useState(32)
  const [todayPosition, setTodayPosition] = useState(getTodayPosition())
  const [todayLevel, setTodayLevel] = useState(3)
  const [months, setMonths] = useState(DEFAULT_MONTHS)
  const [periodFilter, setPeriodFilter] = useState('all') // 'all', '3months', '6months', '1year'
  const [selectedTask, setSelectedTask] = useState(null)
  const [lastSync, setLastSync] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasLocalChanges, setHasLocalChanges] = useState(false)
  const containerRef = useRef(null)
  const timelineRef = useRef(null)
  const dragRef = useRef(null) // Pour stocker les données de drag en cours
  const [ganttWidth, setGanttWidth] = useState(0)

  // Mesurer la largeur disponible pour le gantt
  useEffect(() => {
    const measureWidth = () => {
      if (timelineRef.current) {
        const timelineWidth = timelineRef.current.offsetWidth
        const sidebarWidth = 140
        setGanttWidth(timelineWidth - sidebarWidth)
      }
    }
    measureWidth()
    window.addEventListener('resize', measureWidth)
    return () => window.removeEventListener('resize', measureWidth)
  }, [])

  // Calculer les positions de filtre selon la période
  const getFilterConfig = () => {
    const today = new Date()
    const baseYear = 2025
    const baseMonth = 11 // Décembre

    if (periodFilter === 'all') {
      return {
        start: 0,
        end: Infinity,
        monthWidth: CONFIG.MONTH_WIDTH,
        scale: 1,
        offset: 0,
        startMonthIndex: 0,
        endMonthIndex: months.length
      }
    }

    // Position de début = début du mois en cours
    const startMonthsDiff = (today.getFullYear() - baseYear) * 12 + (today.getMonth() - baseMonth)
    const startPosition = startMonthsDiff * CONFIG.MONTH_WIDTH

    let monthsToAdd = 0
    if (periodFilter === '3months') monthsToAdd = 3
    else if (periodFilter === '6months') monthsToAdd = 6
    else if (periodFilter === '1year') monthsToAdd = 12

    const endMonthsDiff = startMonthsDiff + monthsToAdd
    const endPosition = endMonthsDiff * CONFIG.MONTH_WIDTH

    // Calculer la largeur dynamique des mois pour remplir l'espace
    const visibleMonthsCount = monthsToAdd
    const displayMonthWidth = ganttWidth > 0 ? ganttWidth / visibleMonthsCount : CONFIG.MONTH_WIDTH
    const scale = displayMonthWidth / CONFIG.MONTH_WIDTH

    return {
      start: startPosition,
      end: endPosition,
      monthWidth: displayMonthWidth,
      scale,
      offset: startPosition,
      startMonthIndex: startMonthsDiff,
      endMonthIndex: endMonthsDiff
    }
  }

  const filterConfig = getFilterConfig()
  const { start: filterStartPosition, end: filterEndPosition } = filterConfig
  const displayMonthWidth = filterConfig.monthWidth
  const filterScale = filterConfig.scale
  const filterOffset = filterConfig.offset

  // Transformer une position originale en position affichée
  const scalePosition = (pos) => {
    if (periodFilter === 'all') return pos
    return (pos - filterOffset) * filterScale
  }

  // Transformer une largeur originale en largeur affichée
  const scaleWidth = (width) => {
    if (periodFilter === 'all') return width
    return width * filterScale
  }

  // Filtrer et clipper les tâches selon la période
  const filteredTasks = tasks
    .filter(t => {
      const taskEnd = t.left + t.width
      return taskEnd > filterStartPosition && t.left < filterEndPosition
    })
    .map(t => {
      if (periodFilter === 'all') return t

      const taskEnd = t.left + t.width
      // Clipper aux limites de la période
      const clippedLeft = Math.max(t.left, filterStartPosition)
      const clippedEnd = Math.min(taskEnd, filterEndPosition)
      const clippedWidth = clippedEnd - clippedLeft

      return {
        ...t,
        left: scalePosition(clippedLeft),
        width: scaleWidth(clippedWidth),
        originalLeft: t.left,
        originalWidth: t.width,
        isClipped: clippedLeft !== t.left || clippedEnd !== taskEnd
      }
    })

  const filteredMilestones = milestones
    .filter(m => m.left >= filterStartPosition && m.left < filterEndPosition)
    .map(m => periodFilter === 'all' ? m : { ...m, left: scalePosition(m.left) })

  const filteredEvenements = evenements
    .filter(e => e.left >= filterStartPosition && e.left < filterEndPosition)
    .map(e => periodFilter === 'all' ? e : { ...e, left: scalePosition(e.left) })

  // Calculer les mois à afficher
  const filteredMonths = periodFilter === 'all'
    ? months
    : months.slice(filterConfig.startMonthIndex, filterConfig.endMonthIndex)

  // Fonction pour synchroniser avec ClickUp
  const syncWithClickUp = async () => {
    setIsLoading(true)
    try {
      // Récupérer les données ClickUp et les positions sauvegardées en parallèle
      const [clickupResponse, positionsResponse] = await Promise.all([
        fetch('http://localhost:3001/api/clickup/tasks'),
        fetch('http://localhost:3001/api/positions')
      ])

      if (!clickupResponse.ok) throw new Error('Erreur API ClickUp')
      const data = await clickupResponse.json()

      // Sauvegarder les positions originales de ClickUp
      setOriginalTasks(data.tasks.map(t => ({ ...t })))

      // Récupérer les ajustements de position depuis PostgreSQL
      let positions = {}
      if (positionsResponse.ok) {
        const posData = await positionsResponse.json()
        positions = posData.positions || {}
      }

      // Vérifier s'il y a des modifications locales
      setHasLocalChanges(Object.keys(positions).length > 0)

      // Merger les données ClickUp avec les positions sauvegardées
      const mergedTasks = data.tasks.map(task => {
        if (positions[task.id]) {
          return { ...task, ...positions[task.id] }
        }
        return task
      })

      setTasks(mergedTasks)
      setMilestones(data.milestones || [])
      setEvenements(data.evenements || [])
      setPastDeliveries(data.pastDeliveries || [])
      setCategoryHeights(data.categoryHeights || DEFAULT_CATEGORY_HEIGHTS)
      setTaskHeight(data.taskHeight || 32)
      setTodayPosition(data.todayPosition || getTodayPosition())
      setTodayLevel(data.todayLevel || 3)
      setMonths(data.months || DEFAULT_MONTHS)
      setLastSync(data.lastSync)
    } catch (error) {
      console.error('Erreur sync ClickUp:', error)
      setTasks([])
      setOriginalTasks([])
      setMilestones([])
      setEvenements([])
      setCategoryHeights(DEFAULT_CATEGORY_HEIGHTS)
    } finally {
      setIsLoading(false)
    }
  }

  // Réinitialiser aux positions ClickUp originales
  const handleReset = async () => {
    if (originalTasks.length === 0) {
      alert('Aucune donnée ClickUp à restaurer. Synchronisez d\'abord.')
      return
    }
    try {
      // Supprimer les positions sauvegardées dans PostgreSQL
      await fetch('http://localhost:3001/api/positions', { method: 'DELETE' })
      // Restaurer les positions originales
      setTasks(originalTasks.map(t => ({ ...t })))
      setHasLocalChanges(false)
    } catch (error) {
      console.error('Erreur reset:', error)
      alert('Erreur lors de la réinitialisation')
    }
  }

  // Gestionnaires de drag pour déplacer les tâches
  const handleDragStart = (e, task, type = 'move') => {
    e.stopPropagation()
    const rect = e.currentTarget.closest('.task').getBoundingClientRect()
    dragRef.current = {
      taskId: task.id,
      type, // 'move' ou 'resize'
      startX: e.clientX,
      startLeft: task.left,
      startWidth: task.width,
      taskRect: rect
    }
    document.addEventListener('mousemove', handleDragMove)
    document.addEventListener('mouseup', handleDragEnd)
  }

  const handleDragMove = (e) => {
    if (!dragRef.current) return
    const { taskId, type, startX, startLeft, startWidth } = dragRef.current
    const deltaX = e.clientX - startX

    setTasks(prevTasks => prevTasks.map(task => {
      if (task.id !== taskId) return task

      let updatedTask
      if (type === 'move') {
        // Déplacer la tâche
        const newLeft = Math.max(0, startLeft + deltaX)
        updatedTask = { ...task, left: newLeft }
      } else if (type === 'resize') {
        // Redimensionner la tâche
        const newWidth = Math.max(CONFIG.MIN_TASK_WIDTH, startWidth + deltaX)
        updatedTask = { ...task, width: newWidth }
      } else {
        updatedTask = task
      }

      // Stocker la tâche modifiée pour la sauvegarde
      dragRef.current.modifiedTask = updatedTask
      return updatedTask
    }))
    setHasLocalChanges(true)
  }

  const handleDragEnd = async () => {
    if (dragRef.current?.modifiedTask) {
      const modifiedTask = dragRef.current.modifiedTask
      // Sauvegarder dans PostgreSQL
      try {
        await fetch(`${CONFIG.API_URL}/api/positions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks: [modifiedTask] })
        })
      } catch (error) {
        console.error('Erreur sauvegarde auto:', error)
      }
    }
    dragRef.current = null
    document.removeEventListener('mousemove', handleDragMove)
    document.removeEventListener('mouseup', handleDragEnd)
  }

  useEffect(() => {
    // Charger depuis ClickUp au démarrage
    syncWithClickUp()
  }, [])

  const handleExportPNG = async () => {
    if (!containerRef.current) return

    try {
      const canvas = await html2canvas(containerRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#F1F3F4'
      })

      const link = document.createElement('a')
      const date = new Date().toISOString().slice(0, 10)
      link.download = `roadmap-rndv-${date}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Erreur export PNG:', error)
      alert("Erreur lors de l'export PNG")
    }
  }

  // Afficher le loader au premier chargement
  if (isLoading && tasks.length === 0) {
    return (
      <div className="roadmap-page">
        <div className="roadmap-loader">
          <div className="loader-spinner"></div>
          <p>Chargement de la roadmap...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="roadmap-page">
      {/* Toolbar sticky */}
      <div className="roadmap-toolbar">
        <div className="toolbar-left">
          <h2 className="roadmap-title">Roadmap Comédie-Française</h2>
          <div className="period-filter">
            <label className="period-filter__label">Période :</label>
            <select
              className="period-filter__select"
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
            >
              <option value="all">Tout afficher</option>
              <option value="3months">3 prochains mois</option>
              <option value="6months">6 prochains mois</option>
              <option value="1year">12 prochains mois</option>
            </select>
          </div>
        </div>
        <div className="toolbar-actions">
          <div className="toolbar-actions-primary">
            <button
              className="btn btn--primary"
              onClick={syncWithClickUp}
              disabled={isLoading}
            >
              {isLoading ? 'Sync...' : 'Sync ClickUp'}
            </button>
            <button
              className="btn btn--secondary"
              onClick={handleReset}
              disabled={!hasLocalChanges}
              title="Réinitialiser aux positions ClickUp"
            >
              Réinitialiser
            </button>
          </div>
          <button className="btn btn--link" onClick={handleExportPNG}>
            Exporter PNG
          </button>
        </div>
      </div>

      <div className="roadmap-container" ref={containerRef}>

        {/* Timeline */}
        <div className="timeline-container" ref={timelineRef}>
          {/* Categories Sidebar */}
          <aside className="categories-sidebar">
            <div className="category-header-space"></div>
            {CATEGORIES.map(cat => (
              <div
                key={cat.id}
                className={`category category--${cat.id}`}
                style={{ height: categoryHeights[cat.id] || 100 }}
              >
                {cat.name}
              </div>
            ))}
          </aside>

          {/* Gantt Area */}
          <div className="gantt-area" style={{ width: filteredMonths.length * displayMonthWidth }}>
            {/* Gantt Header - Sticky */}
            <div className="gantt-header">
              {/* Milestones Row */}
              <div className="milestones-row">
                {/* Today Indicator Label */}
                {(todayPosition >= filterStartPosition && todayPosition < filterEndPosition) && (
                  <>
                    <div
                      className={`today-indicator-label today-indicator-label--level-${todayLevel}`}
                      style={{ left: scalePosition(todayPosition) }}
                    >
                      Aujourd'hui
                    </div>
                    <div
                      className={`today-indicator-connector today-indicator-connector--level-${todayLevel}`}
                      style={{ left: scalePosition(todayPosition) }}
                    />
                  </>
                )}
                {filteredMilestones.map((milestone) => (
                  <div key={milestone.id}>
                    <div
                      className={`milestone-label milestone-label--${milestone.milestoneType} milestone-label--level-${milestone.level}`}
                      style={{ left: milestone.left }}
                    >
                      {milestone.milestoneDate} - {milestone.name}
                    </div>
                    <div
                      className={`milestone-connector milestone-connector--${milestone.milestoneType} milestone-connector--level-${milestone.level}`}
                      style={{ left: milestone.left }}
                    />
                  </div>
                ))}
              </div>

              {/* Years Row */}
              <div className="years-row">
                {(() => {
                  const years = []
                  let currentYear = null
                  let count = 0
                  filteredMonths.forEach((month, idx) => {
                    if (month.year !== currentYear) {
                      if (currentYear !== null) {
                        years.push({ year: currentYear, width: count * displayMonthWidth })
                      }
                      currentYear = month.year
                      count = 1
                    } else {
                      count++
                    }
                    if (idx === filteredMonths.length - 1) {
                      years.push({ year: currentYear, width: count * displayMonthWidth })
                    }
                  })
                  return years.map((y, i) => (
                    <div key={i} className="year-block" style={{ width: y.width }}>{y.year}</div>
                  ))
                })()}
              </div>

              {/* Months Row */}
              <div className="months-row">
                {filteredMonths.map((month, index) => (
                  <div key={index} className="month" style={{ width: displayMonthWidth }}>{month.name}</div>
                ))}
              </div>
            </div>

            {/* Gantt Content */}
            <div className="gantt-content">
              {/* Today Indicator Line */}
              {(todayPosition >= filterStartPosition && todayPosition < filterEndPosition) && (
                <div
                  className="today-indicator"
                  style={{ left: scalePosition(todayPosition) }}
                />
              )}

              {/* Milestone Lines */}
              <div className="milestones-lines">
                {filteredMilestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className={`milestone-line milestone-line--${milestone.milestoneType}`}
                    style={{ left: milestone.left }}
                  />
                ))}
              </div>

              {/* Rows */}
              {CATEGORIES.map(cat => (
                <div
                  key={cat.id}
                  className="gantt-row"
                  data-row={cat.id}
                  style={{ height: categoryHeights[cat.id] || 100 }}
                >
                  {filteredMonths.map((_, idx) => (
                    <div key={idx} className="gantt-cell" style={{ width: displayMonthWidth }} />
                  ))}
                  {/* Tasks for this row */}
                  {filteredTasks
                    .filter(task => task.row === cat.id)
                    .map(task => (
                      <div
                        key={task.id}
                        className={`task task--${task.type}${task.delivered ? ' task--delivered' : ''}${task.priority ? ' task--priority' : ''}`}
                        style={{
                          left: task.left,
                          top: task.top,
                          width: task.width,
                          height: taskHeight,
                          cursor: 'grab'
                        }}
                        onClick={() => setSelectedTask(task)}
                        onMouseDown={(e) => handleDragStart(e, task, 'move')}
                        title={task.name}
                      >
                        <span className="task__name">{task.name}</span>
                        <span className="task__tooltip">{task.name}</span>
                        {/* Poignée de redimensionnement */}
                        <div
                          className="task__resize-handle"
                          onMouseDown={(e) => handleDragStart(e, task, 'resize')}
                        />
                      </div>
                    ))}
                  {/* Événements avec étoile (seulement dans commercialisation) */}
                  {cat.id === 'commercialisation' && filteredEvenements.map(event => (
                    <div
                      key={event.id}
                      className="evenement"
                      style={{
                        left: event.left,
                        top: event.top
                      }}
                    >
                      <span className="evenement__star">★</span>
                      <span className="evenement__label">{event.milestoneDate} - {event.name}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend & Sync Status */}
        <div className="roadmap-legend">
          {lastSync && (
            <div className="sync-status-footer">
              Dernière synchronisation ClickUp : {new Date(lastSync).toLocaleString('fr-FR')}
            </div>
          )}
          <div className="legend-items">
            {filteredTasks.some(t => t.delivered) && (
              <div className="legend-item">
                <div className="legend-box legend-box--delivered"></div>
                <span>Livraison maintenue au planning initial</span>
              </div>
            )}
            {filteredTasks.some(t => t.priority) && (
              <div className="legend-item">
                <div className="legend-box legend-box--priority"></div>
                <span>Livraison prioritaire</span>
              </div>
            )}
            {filteredMilestones.length > 0 && (
              <div className="legend-item">
                <div className="legend-box legend-box--temps-fort"></div>
                <span>Temps forts CF</span>
              </div>
            )}
            {filteredEvenements.length > 0 && (
              <div className="legend-item">
                <span className="legend-star">★</span>
                <span>Événements</span>
              </div>
            )}
          </div>
        </div>

        {/* Delivery Summary */}
        <section className="delivery-summary">
          <h2 className="delivery-summary__title">Récapitulatif des dates de livraison</h2>
          <div className="delivery-summary__sections">
            {CATEGORIES.map(cat => {
              // Tâches du planning (après décembre 2025)
              const planningTasks = filteredTasks
                .filter(task => task.row === cat.id)
                .map(task => {
                  // Utiliser les positions originales (non clippées) pour les dates
                  const originalEndPosition = (task.originalLeft ?? task.left) + (task.originalWidth ?? task.width)
                  return {
                    name: task.name,
                    endDate: positionToDate(originalEndPosition),
                    endPosition: originalEndPosition,
                    endTimestamp: originalEndPosition, // Pour le tri
                    isPast: originalEndPosition < todayPosition
                  }
                })

              // Tâches livrées avant décembre 2025
              const pastTasks = pastDeliveries
                .filter(task => task.row === cat.id)
                .map(task => {
                  // Convertir la date JJ/MM/YYYY en date lisible
                  const [day, month, year] = task.endDate.split('/')
                  const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
                  const dayStr = parseInt(day) === 1 ? '1er' : parseInt(day)
                  const monthName = MONTH_NAMES[parseInt(month) - 1]
                  return {
                    name: task.name,
                    endDate: `${dayStr} ${monthName} ${year}`,
                    endTimestamp: task.endTimestamp,
                    isPast: true
                  }
                })

              // Combiner et trier par date
              const allTasks = [...pastTasks, ...planningTasks]
                .sort((a, b) => a.endTimestamp - b.endTimestamp)

              if (allTasks.length === 0) return null

              return (
                <div key={cat.id} className={`delivery-summary__section delivery-summary__section--${cat.id}`}>
                  <h3 className="delivery-summary__section-title">{cat.name}</h3>
                  <ul className="delivery-summary__list">
                    {allTasks.map((task, idx) => (
                      <li key={idx} className={`delivery-summary__item${task.isPast ? ' delivery-summary__item--past' : ''}`}>
                        <span className="delivery-summary__task-name">{task.name}</span>
                        <span className="delivery-summary__date">{task.endDate}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
          <div className="delivery-summary__legend">
            <span className="delivery-summary__legend-item delivery-summary__legend-item--past">
              <span className="delivery-summary__legend-dot"></span>
              Livraison passée
            </span>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Roadmap
