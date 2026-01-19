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
  '#4285f4', '#ea4335', '#fbbc04', '#34a853', '#ff6d01',
  '#46bdc6', '#7baaf7', '#f07b72', '#fcd04f', '#81c995',
  '#ff8a65', '#4dd0e1', '#ba68c8', '#aed581', '#ffb74d',
  '#90a4ae', '#f48fb1', '#80deea', '#ce93d8', '#c5e1a5',
  '#ffcc80', '#b0bec5', '#ef9a9a', '#80cbc4', '#e6ee9c',
  '#ffe082', '#bcaaa4', '#b39ddb', '#9fa8da', '#a5d6a7'
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
    if (firstHalf === 0 && secondHalf === 0) return { className: 'trend-stable', icon: '—', text: 'N/A' }
    if (firstHalf === 0) return { className: 'trend-up', icon: '↑', text: 'Nouveau' }
    const ratio = secondHalf / firstHalf
    if (ratio < 0.6) return { className: 'trend-down', icon: '↓', text: 'En baisse' }
    if (ratio > 1.4) return { className: 'trend-up', icon: '↑', text: 'En hausse' }
    return { className: 'trend-stable', icon: '→', text: 'Stable' }
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
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Chargement des données...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h2>Erreur</h2>
        <p>{error}</p>
        <p className="error-hint">Assurez-vous que le serveur backend est lancé sur le port 3001</p>
        <button className="btn btn--primary" onClick={fetchData}>Réessayer</button>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <h1 className="dashboard-title">RNDV - Tableau de Bord</h1>
      <p className="dashboard-subtitle">Comédie-Française | Suivi des incidents billetterie</p>
      <p className="last-update">Dernière mise à jour: {data?.lastUpdate}</p>

      {/* Section Aujourd'hui */}
      <section className="today-section">
        <div className="today-header">
          <h2>Tendances du Jour</h2>
          <span className="today-date">{data?.today?.date}</span>
        </div>

        <div className="today-stats">
          <div className="today-stat">
            <div className="value">{todayStats.total}</div>
            <div className="label">Tickets du jour</div>
          </div>
          <div className="today-stat critical">
            <div className="value">{todayStats.critique}</div>
            <div className="label">Critique</div>
          </div>
          <div className="today-stat major">
            <div className="value">{todayStats.majeur}</div>
            <div className="label">Majeur</div>
          </div>
          <div className="today-stat">
            <div className="value">{todayStats.mineur}</div>
            <div className="label">Mineur</div>
          </div>
        </div>

        <div className="today-content">
          <div className="today-problems">
            <h3>Problèmes signalés</h3>
            {todayProblemGroups.length === 0 ? (
              <div className="no-problems">Aucun ticket aujourd'hui</div>
            ) : (
              todayProblemGroups.map((problem, idx) => (
                <div key={idx} className="problem-item">
                  <span className="problem-name">
                    <span className={`urgency-badge urgency-${problem.urgence.toLowerCase().replace('/', '-')}`}>
                      {problem.urgence}
                    </span>
                    {problem.name}
                  </span>
                  <span className="problem-count">{problem.count}</span>
                </div>
              ))
            )}
          </div>

          <div className="today-history">
            <h3>Volume des 15 derniers jours</h3>
            <div className="history-chart-container">
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
      <h3 className="section-title">Analyse Mensuelle</h3>
      <div className="filter-info">Problèmes ayant au moins une occurrence dans les 3 derniers mois</div>

      {/* Contrôles */}
      <div className="controls">
        <div className="controls-header">
          <h3>Sélectionner les problèmes (classés par récurrence)</h3>
          <div className="controls-actions">
            <button onClick={() => selectTop(5)}>Top 5</button>
            <button onClick={() => selectTop(10)}>Top 10</button>
            <button onClick={selectAll}>Tout</button>
            <button onClick={selectNone}>Aucun</button>
          </div>
        </div>
        <div className="checkbox-grid">
          {sortedProblems.map((problem, index) => (
            <div
              key={problem.name}
              className={`checkbox-item ${selectedProblems.includes(problem.name) ? 'checked' : ''}`}
              onClick={() => toggleProblem(problem.name)}
            >
              <span
                className="color-dot"
                style={{ background: COLORS[index % COLORS.length] }}
              />
              <input
                type="checkbox"
                checked={selectedProblems.includes(problem.name)}
                onChange={() => toggleProblem(problem.name)}
                onClick={(e) => e.stopPropagation()}
              />
              <label>{problem.name}</label>
              <span className="occurrence-badge">{problem.total}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Graphique d'évolution */}
      <div className="chart-container">
        <div className="chart-wrapper">
          {evolutionChartData && (
            <Bar
              data={evolutionChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                    labels: { usePointStyle: true, padding: 15, font: { size: 11 } }
                  },
                  title: {
                    display: true,
                    text: 'Évolution des problèmes par mois',
                    font: { size: 16 }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Nombre de tickets' }
                  },
                  x: {
                    title: { display: true, text: 'Période' }
                  }
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Tableau récapitulatif */}
      <div className="table-container">
        <h3>Tableau récapitulatif</h3>
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
                <td colSpan={data?.months?.length + 3} className="no-data">
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
                          className="table-color-dot"
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
  )
}

export default Dashboard
