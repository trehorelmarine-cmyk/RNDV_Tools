import { useState, useEffect, useRef } from 'react'
import html2canvas from 'html2canvas'
import './Roadmap.css'

// Configuration
const CONFIG = {
  MONTH_WIDTH: 100,
  SNAP_GRID: 20,
  MIN_TASK_WIDTH: 40,
  STORAGE_KEY: 'roadmap-tasks',
  MONTHS: [
    { name: 'DEC', year: 2025 },
    { name: 'JAN', year: 2026 },
    { name: 'FEV', year: 2026 },
    { name: 'MAR', year: 2026 },
    { name: 'AVR', year: 2026 },
    { name: 'MAI', year: 2026 },
    { name: 'JUIN', year: 2026 },
    { name: 'JUIL', year: 2026 },
    { name: 'AOUT', year: 2026 },
    { name: 'SEP', year: 2026 },
    { name: 'OCT', year: 2026 },
    { name: 'NOV', year: 2026 },
    { name: 'DEC', year: 2026 },
    { name: 'JAN', year: 2027 }
  ]
}

const INITIAL_TASKS = [
  // PAC
  { id: 'task-1', row: 'pac', name: 'Preparation HLM', type: 'pac', left: 10, top: 45, width: 140 },
  { id: 'task-2', row: 'pac', name: 'Accompagnement HLM', type: 'pac', left: 151, top: 45, width: 584 },
  // RAPPORTS
  { id: 'task-4', row: 'rapports', name: 'Rapports lot 3', type: 'rapports', left: 5, top: 45, width: 95, delivered: true },
  { id: 'task-5', row: 'rapports', name: 'Ventilation recettes', type: 'rapports', left: 280, top: 45, width: 120, priority: true },
  // VENTE
  { id: 'task-9', row: 'vente', name: 'Exports PDF', type: 'vente', left: 5, top: 5, width: 95, delivered: true },
  { id: 'task-12', row: 'vente', name: 'Optimisation BOCA', type: 'vente', left: 5, top: 45, width: 252 },
  // BILLETTERIE
  { id: 'task-17', row: 'billetterie', name: 'Ecran client caisse', type: 'billetterie-light', left: 700, top: 5, width: 150 },
  // PMO
  { id: 'task-22', row: 'pmo', name: 'Prepa ateliers', type: 'pmo', left: 10, top: 25, width: 110 },
  { id: 'task-23', row: 'pmo', name: 'Ateliers specif.', type: 'pmo', left: 130, top: 25, width: 120 },
  // COMMERCIALISATION
  { id: 'task-27', row: 'commercialisation', name: 'Cadrage PITCH', type: 'commercialisation', left: 10, top: 25, width: 120 },
  { id: 'task-28', row: 'commercialisation', name: 'Redaction PITCH', type: 'commercialisation', left: 140, top: 25, width: 130 }
]

const MILESTONES = [
  { date: '21/01', label: 'BIS Nantes', position: 170, color: 'blue', level: 1, category: 'commercialisation' },
  { date: '21/03', label: 'PUBLICS XP Marseille', position: 420, color: 'blue', level: 3, category: 'commercialisation' },
  { date: '26/03', label: 'SITEM', position: 530, color: 'blue', level: 1, category: 'commercialisation' },
  { date: '27/02', label: 'Go Prod', position: 290, color: 'red', level: 2, category: 'billetterie' },
  { date: '23-30/06', label: 'MEV 26-27', position: 680, color: 'red', level: 1, category: 'billetterie' }
]

const CATEGORIES = [
  { id: 'pac', name: 'PAC' },
  { id: 'rapports', name: 'RAPPORTS' },
  { id: 'vente', name: 'VENTE' },
  { id: 'billetterie', name: 'GESTION BILLETTERIE' },
  { id: 'pmo', name: 'PMO' },
  { id: 'commercialisation', name: 'COMMERCIALISATION' }
]

// Fonction utilitaire pour convertir une position en date
function positionToDate(position) {
  const monthIndex = Math.floor(position / CONFIG.MONTH_WIDTH)
  const dayInMonth = Math.round((position % CONFIG.MONTH_WIDTH) / CONFIG.MONTH_WIDTH * 30)

  const months = [
    { month: 12, year: 2025, name: 'Déc' },
    { month: 1, year: 2026, name: 'Jan' },
    { month: 2, year: 2026, name: 'Fév' },
    { month: 3, year: 2026, name: 'Mar' },
    { month: 4, year: 2026, name: 'Avr' },
    { month: 5, year: 2026, name: 'Mai' },
    { month: 6, year: 2026, name: 'Juin' },
    { month: 7, year: 2026, name: 'Juil' },
    { month: 8, year: 2026, name: 'Août' },
    { month: 9, year: 2026, name: 'Sep' },
    { month: 10, year: 2026, name: 'Oct' },
    { month: 11, year: 2026, name: 'Nov' },
    { month: 12, year: 2026, name: 'Déc' },
    { month: 1, year: 2027, name: 'Jan' }
  ]

  const monthData = months[Math.min(monthIndex, months.length - 1)]
  const day = Math.max(1, Math.min(dayInMonth + 1, 30))

  return `${day} ${monthData.name} ${monthData.year}`
}

function Roadmap() {
  const [tasks, setTasks] = useState([])
  const [selectedTask, setSelectedTask] = useState(null)
  const [dragging, setDragging] = useState(null)
  const containerRef = useRef(null)

  useEffect(() => {
    // Charger depuis localStorage ou utiliser les donnees initiales
    const saved = localStorage.getItem(CONFIG.STORAGE_KEY)
    if (saved) {
      setTasks(JSON.parse(saved))
    } else {
      setTasks(INITIAL_TASKS)
    }
  }, [])

  const handleSave = () => {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(tasks))
    alert('Sauvegarde reussie !')
  }

  const handleReset = () => {
    if (confirm('Reinitialiser toutes les positions ?')) {
      setTasks(INITIAL_TASKS)
      localStorage.removeItem(CONFIG.STORAGE_KEY)
    }
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
        <h2 className="roadmap-title">Roadmap Comédie-Française</h2>
        <div className="toolbar-actions">
          <button className="btn btn--secondary" onClick={handleExportPNG}>
            📷 Exporter PNG
          </button>
          <button className="btn btn--primary" onClick={handleSave}>
            💾 Sauvegarder
          </button>
          <button className="btn btn--danger" onClick={handleReset}>
            🔄 Réinitialiser
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
              <div key={cat.id} className={`category category--${cat.id}`}>
                {cat.name}
              </div>
            ))}
          </aside>

          {/* Gantt Area */}
          <div className="gantt-area">
            {/* Gantt Header - Sticky */}
            <div className="gantt-header">
              {/* Milestones Row */}
              <div className="milestones-row">
                {MILESTONES.map((milestone, index) => (
                  <div key={index}>
                    <div
                      className={`milestone-label milestone-label--${milestone.color} milestone-label--level-${milestone.level}`}
                      style={{ left: milestone.position }}
                    >
                      {milestone.date} - {milestone.label}
                    </div>
                    <div
                      className={`milestone-connector milestone-connector--${milestone.color} milestone-connector--level-${milestone.level}`}
                      style={{ left: milestone.position }}
                    />
                  </div>
                ))}
              </div>

              {/* Years Row */}
              <div className="years-row">
                <div className="year-block" style={{ width: 100 }}>2025</div>
                <div className="year-block" style={{ width: 1200 }}>2026</div>
                <div className="year-block" style={{ width: 100 }}>2027</div>
              </div>

              {/* Months Row */}
              <div className="months-row">
                {CONFIG.MONTHS.map((month, index) => (
                  <div key={index} className="month">{month.name}</div>
                ))}
              </div>
            </div>

            {/* Gantt Content */}
            <div className="gantt-content">
              {/* Milestone Lines */}
              <div className="milestones-lines">
                {MILESTONES.map((milestone, index) => (
                  <div
                    key={index}
                    className={`milestone-line milestone-line--${milestone.color}`}
                    style={{ left: milestone.position }}
                  />
                ))}
                <div className="milestone-line milestone-line--red" style={{ left: 680 }} />
              </div>

              {/* Rows */}
              {CATEGORIES.map(cat => (
                <div key={cat.id} className="gantt-row" data-row={cat.id}>
                  {CONFIG.MONTHS.map((_, idx) => (
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
                          width: task.width
                        }}
                        onClick={() => setSelectedTask(task)}
                      >
                        <span className="task__name">{task.name}</span>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <footer className="roadmap-legend">
          <span className="legend-help">
            💡 Glissez les tâches • Tirez les bords pour redimensionner • Double-clic pour éditer
          </span>
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
              <div className="legend-box legend-box--light"></div>
              <span>Planning à valider post validation des spécifications</span>
            </div>
          </div>
        </footer>

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
