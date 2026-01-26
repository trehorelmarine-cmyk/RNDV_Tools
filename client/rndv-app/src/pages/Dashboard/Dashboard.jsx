import { useState, useEffect, useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import './Dashboard.css'

// Enregistrer les composants Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const COLORS = [
  '#4630EA', '#EF4444', '#F59E0B', '#10B981', '#F97316',
  '#06B6D4', '#7C3AED', '#EC4899', '#84CC16', '#6366F1',
  '#14B8A6', '#E11D48', '#D946EF', '#8B5CF6', '#0EA5E9',
  '#F43F5E', '#A855F7', '#22D3EE', '#FB923C', '#4ADE80',
  '#FBBF24', '#2DD4BF', '#FB7185', '#818CF8', '#34D399',
  '#FCD34D', '#A78BFA', '#38BDF8', '#C084FC', '#67E8F9'
]

const API_URL = 'http://localhost:3001/api/dashboard'

function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedProblems, setSelectedProblems] = useState([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(API_URL)
      if (!response.ok) throw new Error('Erreur de chargement des données')
      const result = await response.json()
      setData(result)
      // Sélectionner les 3 premiers problèmes par défaut
      const defaultSelected = Object.keys(result.monthlyData).slice(0, 3)
      setSelectedProblems(defaultSelected)
    } catch (err) {
      setError(err.message)
      console.error('Erreur:', err)
    } finally {
      setLoading(false)
    }
  }

  // Trier les problèmes par occurrence totale
  const sortedProblems = useMemo(() => {
    if (!data?.monthlyData) return []
    return Object.entries(data.monthlyData)
      .map(([name, values]) => ({
        name,
        total: values.reduce((a, b) => a + b, 0)
      }))
      .sort((a, b) => b.total - a.total)
  }, [data])

  // Données pour le graphique historique
  const historyChartData = useMemo(() => {
    if (!data?.history) return null
    return {
      labels: data.history.dates,
      datasets: [{
        data: data.history.counts,
        backgroundColor: data.history.counts.map((_, i) =>
          i === data.history.counts.length - 1 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)'
        ),
        borderRadius: 3
      }]
    }
  }, [data])

  // Données pour le graphique d'évolution
  const evolutionChartData = useMemo(() => {
    if (!data?.monthlyData || !data?.months) return null

    const datasets = selectedProblems
      .sort((a, b) => {
        const idxA = sortedProblems.findIndex(p => p.name === a)
        const idxB = sortedProblems.findIndex(p => p.name === b)
        return idxA - idxB
      })
      .map(problem => {
        const idx = sortedProblems.findIndex(p => p.name === problem)
        return {
          label: problem,
          data: data.monthlyData[problem],
          backgroundColor: COLORS[idx % COLORS.length],
          borderRadius: 4
        }
      })

    return {
      labels: data.months,
      datasets
    }
  }, [data, selectedProblems, sortedProblems])

  // Stats du jour
  const todayStats = useMemo(() => {
    if (!data?.today?.tickets) return { total: 0, critique: 0, majeur: 0, mineur: 0 }
    const tickets = data.today.tickets
    return {
      total: tickets.length,
      critique: tickets.filter(t => t.urgence === 'Critique').length,
      majeur: tickets.filter(t => t.urgence === 'Majeur').length,
      mineur: tickets.filter(t => t.urgence === 'Mineur').length
    }
  }, [data])

  // Problèmes groupés du jour
  const todayProblemGroups = useMemo(() => {
    if (!data?.today?.tickets) return []
    const groups = {}
    data.today.tickets.forEach(t => {
      if (!groups[t.probleme]) {
        groups[t.probleme] = { count: 0, urgence: t.urgence }
      }
      groups[t.probleme].count++
      if (t.urgence === 'Critique') groups[t.probleme].urgence = 'Critique'
      else if (t.urgence === 'Majeur' && groups[t.probleme].urgence !== 'Critique') {
        groups[t.probleme].urgence = 'Majeur'
      }
    })
    return Object.entries(groups)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
  }, [data])

  // Calculer la tendance
  const getTrend = (values) => {
    const firstHalf = values.slice(0, Math.ceil(values.length / 2)).reduce((a, b) => a + b, 0)
    const secondHalf = values.slice(Math.ceil(values.length / 2)).reduce((a, b) => a + b, 0)
    if (firstHalf === 0 && secondHalf === 0) return { className: 'dash-trend--stable', icon: '—', text: 'N/A' }
    if (firstHalf === 0) return { className: 'dash-trend--up', icon: '↑', text: 'Nouveau' }
    const ratio = secondHalf / firstHalf
    if (ratio < 0.6) return { className: 'dash-trend--down', icon: '↓', text: 'En baisse' }
    if (ratio > 1.4) return { className: 'dash-trend--up', icon: '↑', text: 'En hausse' }
    return { className: 'dash-trend--stable', icon: '→', text: 'Stable' }
  }

  // Actions de sélection
  const toggleProblem = (problem) => {
    setSelectedProblems(prev =>
      prev.includes(problem)
        ? prev.filter(p => p !== problem)
        : [...prev, problem]
    )
  }

  const selectTop = (n) => {
    setSelectedProblems(sortedProblems.slice(0, n).map(p => p.name))
  }

  const selectAll = () => {
    setSelectedProblems(Object.keys(data.monthlyData))
  }

  const selectNone = () => {
    setSelectedProblems([])
  }

  if (loading) {
    return (
      <div className="dash-page">
        <div className="dash-loader">
          <div className="loader-spinner"></div>
          <p>Chargement des données...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dash-page">
        <div className="dash-error">
          <h2>Erreur</h2>
          <p>{error}</p>
          <p className="dash-error__hint">Assurez-vous que le serveur backend est lancé sur le port 3001</p>
          <button className="btn btn--primary" onClick={fetchData}>Réessayer</button>
        </div>
      </div>
    )
  }

  return (
    <div className="dash-page">
      {/* Toolbar */}
      <div className="dash-toolbar">
        <div className="dash-toolbar__left">
          <h2 className="dash-toolbar__title">Dashboard Support - Incidents Billetterie</h2>
        </div>
        <button className="btn btn--primary" onClick={fetchData}>
          Actualiser
        </button>
      </div>

      <div className="dash-container">
        {/* Section Aujourd'hui */}
        <section className="dash-today">
          <div className="dash-today__header">
            <h3 className="dash-today__title">Tendances du Jour</h3>
            <span className="dash-today__date">{data?.today?.date}</span>
          </div>

          <div className="dash-today__stats">
            <div className="dash-stat">
              <div className="dash-stat__value">{todayStats.total}</div>
              <div className="dash-stat__label">Tickets du jour</div>
            </div>
            <div className="dash-stat dash-stat--critical">
              <div className="dash-stat__value">{todayStats.critique}</div>
              <div className="dash-stat__label">Critique</div>
            </div>
            <div className="dash-stat dash-stat--major">
              <div className="dash-stat__value">{todayStats.majeur}</div>
              <div className="dash-stat__label">Majeur</div>
            </div>
            <div className="dash-stat dash-stat--minor">
              <div className="dash-stat__value">{todayStats.mineur}</div>
              <div className="dash-stat__label">Mineur</div>
            </div>
          </div>

          <div className="dash-today__content">
            <div className="dash-today__problems">
              <h4>Problèmes signalés</h4>
              {todayProblemGroups.length === 0 ? (
                <div className="dash-today__empty">Aucun ticket aujourd'hui</div>
              ) : (
                todayProblemGroups.map((problem, idx) => (
                  <div key={idx} className="dash-problem">
                    <span className="dash-problem__name">
                      <span className={`dash-badge dash-badge--${problem.urgence.toLowerCase().replace('/', '-')}`}>
                        {problem.urgence}
                      </span>
                      {problem.name}
                    </span>
                    <span className="dash-problem__count">{problem.count}</span>
                  </div>
                ))
              )}
            </div>

            <div className="dash-today__history">
              <h4>Volume des 15 derniers jours</h4>
              <div className="dash-today__chart">
                {historyChartData && (
                  <Bar
                    data={historyChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: {
                          beginAtZero: true,
                          grid: { color: 'rgba(255,255,255,0.1)' },
                          ticks: { color: 'rgba(255,255,255,0.7)', font: { size: 10 } }
                        },
                        x: {
                          grid: { display: false },
                          ticks: { color: 'rgba(255,255,255,0.7)', font: { size: 10 } }
                        }
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section Analyse Mensuelle */}
        <section className="dash-section">
          <div className="dash-section__header">
            <h3 className="dash-section__title">Analyse Mensuelle</h3>
            <span className="dash-section__info">Problèmes ayant au moins une occurrence dans les 3 derniers mois</span>
          </div>

          {/* Contrôles */}
          <div className="dash-controls">
            <div className="dash-controls__header">
              <h4>Sélectionner les problèmes (classés par récurrence)</h4>
              <div className="dash-controls__actions">
                <button className="btn btn--secondary" onClick={() => selectTop(5)}>Top 5</button>
                <button className="btn btn--secondary" onClick={() => selectTop(10)}>Top 10</button>
                <button className="btn btn--secondary" onClick={selectAll}>Tout</button>
                <button className="btn btn--secondary" onClick={selectNone}>Aucun</button>
              </div>
            </div>
            <div className="dash-checkbox-grid">
              {sortedProblems.map((problem, index) => (
                <div
                  key={problem.name}
                  className={`dash-checkbox ${selectedProblems.includes(problem.name) ? 'dash-checkbox--checked' : ''}`}
                  onClick={() => toggleProblem(problem.name)}
                >
                  <span
                    className="dash-checkbox__dot"
                    style={{ background: COLORS[index % COLORS.length] }}
                  />
                  <input
                    type="checkbox"
                    checked={selectedProblems.includes(problem.name)}
                    onChange={() => toggleProblem(problem.name)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <label>{problem.name}</label>
                  <span className="dash-checkbox__badge">{problem.total}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Graphique d'évolution */}
          <div className="dash-chart">
            <div className="dash-chart__wrapper">
              {evolutionChartData && (
                <Bar
                  data={evolutionChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: { usePointStyle: true, padding: 15, font: { size: 11, family: 'Rubik' } }
                      },
                      title: {
                        display: true,
                        text: 'Évolution des problèmes par mois',
                        font: { size: 14, family: 'Rubik', weight: '600' },
                        color: '#000'
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Nombre de tickets', font: { family: 'Rubik' } },
                        grid: { color: 'rgba(0,0,0,0.06)' }
                      },
                      x: {
                        title: { display: true, text: 'Période', font: { family: 'Rubik' } },
                        grid: { display: false }
                      }
                    }
                  }}
                />
              )}
            </div>
          </div>

          {/* Tableau récapitulatif */}
          <div className="dash-table">
            <h4>Tableau récapitulatif</h4>
            <div className="dash-table__scroll">
              <table>
                <thead>
                  <tr>
                    <th>Problème</th>
                    {data?.months?.map((m, i) => <th key={i}>{m}</th>)}
                    <th>Total</th>
                    <th>Tendance</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProblems.length === 0 ? (
                    <tr>
                      <td colSpan={data?.months?.length + 3} className="dash-table__empty">
                        Sélectionnez des problèmes
                      </td>
                    </tr>
                  ) : (
                    selectedProblems
                      .sort((a, b) => {
                        const idxA = sortedProblems.findIndex(p => p.name === a)
                        const idxB = sortedProblems.findIndex(p => p.name === b)
                        return idxA - idxB
                      })
                      .map(problem => {
                        const values = data.monthlyData[problem]
                        const total = values.reduce((a, b) => a + b, 0)
                        const trend = getTrend(values)
                        const idx = sortedProblems.findIndex(p => p.name === problem)

                        return (
                          <tr key={problem}>
                            <td>
                              <span
                                className="dash-table__dot"
                                style={{ background: COLORS[idx % COLORS.length] }}
                              />
                              {problem}
                            </td>
                            {values.map((v, i) => <td key={i}>{v || '-'}</td>)}
                            <td><strong>{total}</strong></td>
                            <td className={trend.className}>{trend.icon} {trend.text}</td>
                          </tr>
                        )
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <div className="dash-footer">
        Dernière mise à jour : {data?.lastUpdate}
      </div>
    </div>
  )
}

export default Dashboard
