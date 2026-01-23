import { useState, useEffect, useRef } from 'react'
import html2canvas from 'html2canvas'
import './Roadmap.css'

// Configuration
const CONFIG = {
  MONTH_WIDTH: 150,
  SNAP_GRID: 20,
  MIN_TASK_WIDTH: 40,
  STORAGE_KEY: 'roadmap-tasks'
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
  const baseDate = new Date(2025, 11, 1) // 1er décembre 2025
  const today = new Date()
  const diffDays = (today - baseDate) / (1000 * 60 * 60 * 24)
  return Math.max(0, Math.round(diffDays * (100 / 30)))
}

// Fonction utilitaire pour convertir une position en date
function positionToDate(position) {
  const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

  // Position 0 = 1er décembre 2025
  const baseDate = new Date(2025, 11, 1)
  const daysFromBase = Math.round(position / CONFIG.MONTH_WIDTH * 30)
  const targetDate = new Date(baseDate)
  targetDate.setDate(targetDate.getDate() + daysFromBase)

  const day = targetDate.getDate()
  const monthName = MONTH_NAMES[targetDate.getMonth()]
  const year = targetDate.getFullYear()

  return `${day} ${monthName} ${year}`
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
  const [milestones, setMilestones] = useState([])
  const [evenements, setEvenements] = useState([])
  const [categoryHeights, setCategoryHeights] = useState(DEFAULT_CATEGORY_HEIGHTS)
  const [taskHeight, setTaskHeight] = useState(32)
  const [todayPosition, setTodayPosition] = useState(getTodayPosition())
  const [todayLevel, setTodayLevel] = useState(3)
  const [months, setMonths] = useState(DEFAULT_MONTHS)
  const [selectedTask, setSelectedTask] = useState(null)
  const [dragging, setDragging] = useState(null)
  const [lastSync, setLastSync] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef(null)

  // Fonction pour synchroniser avec ClickUp
  const syncWithClickUp = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:3001/api/clickup/tasks')
      if (!response.ok) throw new Error('Erreur API')
      const data = await response.json()

      // Récupérer les ajustements de position sauvegardés
      const savedPositions = localStorage.getItem(CONFIG.STORAGE_KEY + '-positions')
      const positions = savedPositions ? JSON.parse(savedPositions) : {}

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
      setCategoryHeights(data.categoryHeights || DEFAULT_CATEGORY_HEIGHTS)
      setTaskHeight(data.taskHeight || 32)
      setTodayPosition(data.todayPosition || getTodayPosition())
      setTodayLevel(data.todayLevel || 3)
      setMonths(data.months || DEFAULT_MONTHS)
      setLastSync(data.lastSync)
    } catch (error) {
      console.error('Erreur sync ClickUp:', error)
      // Fallback: charger depuis localStorage
      const saved = localStorage.getItem(CONFIG.STORAGE_KEY)
      setTasks(saved ? JSON.parse(saved) : [])
      setMilestones([])
      setEvenements([])
      setCategoryHeights(DEFAULT_CATEGORY_HEIGHTS)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Charger depuis ClickUp au démarrage
    syncWithClickUp()
  }, [])

  const handleSave = () => {
    // Sauvegarder les tâches complètes
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(tasks))
    // Sauvegarder aussi les positions séparément pour le merge avec ClickUp
    const positions = {}
    tasks.forEach(task => {
      positions[task.id] = { left: task.left, top: task.top, width: task.width }
    })
    localStorage.setItem(CONFIG.STORAGE_KEY + '-positions', JSON.stringify(positions))
    alert('Sauvegarde reussie !')
  }

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

  return (
    <div className="roadmap-page">
      {/* Toolbar sticky */}
      <div className="roadmap-toolbar">
        <div className="toolbar-left">
          <h2 className="roadmap-title">Roadmap Comédie-Française</h2>
          {lastSync && (
            <span className="sync-status">
              Dernière sync: {new Date(lastSync).toLocaleString('fr-FR')}
            </span>
          )}
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
            <button className="btn btn--primary" onClick={handleSave}>
              Sauvegarder
            </button>
          </div>
          <button className="btn btn--link" onClick={handleExportPNG}>
            Exporter PNG
          </button>
        </div>
      </div>

      <div className="roadmap-container" ref={containerRef}>

        {/* Timeline */}
        <div className="timeline-container">
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
          <div className="gantt-area" style={{ width: months.length * CONFIG.MONTH_WIDTH }}>
            {/* Gantt Header - Sticky */}
            <div className="gantt-header">
              {/* Milestones Row */}
              <div className="milestones-row">
                {/* Today Indicator Label */}
                <div
                  className={`today-indicator-label today-indicator-label--level-${todayLevel}`}
                  style={{ left: todayPosition }}
                >
                  Aujourd'hui
                </div>
                <div
                  className={`today-indicator-connector today-indicator-connector--level-${todayLevel}`}
                  style={{ left: todayPosition }}
                />
                {milestones.map((milestone) => (
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
                  months.forEach((month, idx) => {
                    if (month.year !== currentYear) {
                      if (currentYear !== null) {
                        years.push({ year: currentYear, width: count * CONFIG.MONTH_WIDTH })
                      }
                      currentYear = month.year
                      count = 1
                    } else {
                      count++
                    }
                    if (idx === months.length - 1) {
                      years.push({ year: currentYear, width: count * CONFIG.MONTH_WIDTH })
                    }
                  })
                  return years.map((y, i) => (
                    <div key={i} className="year-block" style={{ width: y.width }}>{y.year}</div>
                  ))
                })()}
              </div>

              {/* Months Row */}
              <div className="months-row">
                {months.map((month, index) => (
                  <div key={index} className="month">{month.name}</div>
                ))}
              </div>
            </div>

            {/* Gantt Content */}
            <div className="gantt-content">
              {/* Today Indicator Line */}
              <div
                className="today-indicator"
                style={{ left: todayPosition }}
              />

              {/* Milestone Lines */}
              <div className="milestones-lines">
                {milestones.map((milestone) => (
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
                  {months.map((_, idx) => (
                    <div key={idx} className="gantt-cell" />
                  ))}
                  {/* Tasks for this row */}
                  {tasks
                    .filter(task => task.row === cat.id)
                    .map(task => (
                      <div
                        key={task.id}
                        className={`task task--${task.type}${task.delivered ? ' task--delivered' : ''}${task.priority ? ' task--priority' : ''}`}
                        style={{
                          left: task.left,
                          top: task.top,
                          width: task.width,
                          height: taskHeight
                        }}
                        onClick={() => setSelectedTask(task)}
                        title={task.name}
                      >
                        <span className="task__name">{task.name}</span>
                        <span className="task__tooltip">{task.name}</span>
                      </div>
                    ))}
                  {/* Événements avec étoile (seulement dans commercialisation) */}
                  {cat.id === 'commercialisation' && evenements.map(event => (
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

        {/* Legend */}
        <div className="roadmap-legend">
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-box legend-box--delivered"></div>
              <span>Livraison maintenue au planning initial</span>
            </div>
            <div className="legend-item">
              <div className="legend-box legend-box--priority"></div>
              <span>Livraison prioritaire</span>
            </div>
            <div className="legend-item">
              <div className="legend-box legend-box--temps-fort"></div>
              <span>Temps forts CF</span>
            </div>
            <div className="legend-item">
              <span className="legend-star">★</span>
              <span>Événements</span>
            </div>
          </div>
        </div>

        {/* Delivery Summary */}
        <section className="delivery-summary">
          <h2 className="delivery-summary__title">Récapitulatif des dates de livraison</h2>
          <div className="delivery-summary__sections">
            {CATEGORIES.map(cat => {
              const categoryTasks = tasks
                .filter(task => task.row === cat.id)
                .map(task => ({
                  name: task.name,
                  endDate: positionToDate(task.left + task.width),
                  endPosition: task.left + task.width
                }))
                .sort((a, b) => a.endPosition - b.endPosition)

              if (categoryTasks.length === 0) return null

              return (
                <div key={cat.id} className={`delivery-summary__section delivery-summary__section--${cat.id}`}>
                  <h3 className="delivery-summary__section-title">{cat.name}</h3>
                  <ul className="delivery-summary__list">
                    {categoryTasks.map((task, idx) => (
                      <li key={idx} className="delivery-summary__item">
                        <span className="delivery-summary__task-name">{task.name}</span>
                        <span className="delivery-summary__date">{task.endDate}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

export default Roadmap
