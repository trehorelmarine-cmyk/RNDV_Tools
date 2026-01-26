import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'
import { parse } from 'csv-parse/sync'
import { fetchAllTasks, testConnection } from './services/clickup.js'
import { getTaskPositions, saveTaskPositions, resetTaskPositions, testConnection as testDbConnection } from './services/database.js'
import { getSpectacles } from './services/spectacles.js'

const app = express()
const PORT = 3001

// Configuration
const GOOGLE_SHEET_ID = '1E9y9HRCBd41nXdTRYZ9yCRaLg6JGGHye5WvaiTiC-C0'
const SHEET_GID = '692995836'

app.use(cors())
app.use(express.json())

// Fonction pour télécharger et parser le CSV
async function fetchSheetData() {
  const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=csv&gid=${SHEET_GID}`
  console.log('Téléchargement des données...')

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Erreur HTTP: ${response.status}`)
  }

  const csvText = await response.text()
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  })

  console.log(`${records.length} lignes téléchargées`)
  return records
}

// Parser une date au format JJ/MM/AAAA
function parseDate(dateStr) {
  if (!dateStr) return null
  const parts = dateStr.replace(/\//g, '-').split('-')
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10)
    const year = parseInt(parts[2], 10)
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month - 1, day)
    }
  }
  return null
}

// Obtenir la clé du mois (MM/YYYY)
function getMonthKey(date) {
  if (!date) return null
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${month}/${year}`
}

// Noms des mois en français
const MONTH_NAMES = {
  '01': 'Jan', '02': 'Fév', '03': 'Mars', '04': 'Avr',
  '05': 'Mai', '06': 'Juin', '07': 'Juil', '08': 'Août',
  '09': 'Sept', '10': 'Oct', '11': 'Nov', '12': 'Déc'
}

// Analyser les données
function analyzeData(records) {
  console.log('Analyse des données...')

  // Filtrer les lignes avec données valides
  const data = records
    .filter(r => r['PROBLÈME'] && r['PROBLÈME'].trim() && r['DATE'])
    .map(r => ({
      ...r,
      _date: parseDate(r['DATE']),
      problem: r['PROBLÈME'].trim(),
      urgency: r['URGENCE / IMPACT'] || 'N/A',
      category: r['CATÉGORIE'] || 'N/A',
      reporter: r['SIGNALÉ PAR'] || 'N/A'
    }))
    .filter(r => r._date)

  console.log(`${data.length} tickets analysés`)

  // Données par mois
  const probByMonth = {}
  const probTotal = {}
  const allMonths = new Set()

  data.forEach(r => {
    const month = getMonthKey(r._date)
    const problem = r.problem

    if (!probByMonth[problem]) probByMonth[problem] = {}
    probByMonth[problem][month] = (probByMonth[problem][month] || 0) + 1
    probTotal[problem] = (probTotal[problem] || 0) + 1
    allMonths.add(month)
  })

  // Trier les mois
  let sortedMonths = Array.from(allMonths).sort((a, b) => {
    const [ma, ya] = a.split('/')
    const [mb, yb] = b.split('/')
    return (parseInt(ya) * 12 + parseInt(ma)) - (parseInt(yb) * 12 + parseInt(mb))
  })

  // Garder les 5 derniers mois
  if (sortedMonths.length > 5) {
    sortedMonths = sortedMonths.slice(-5)
  }

  // Derniers 3 mois pour le filtre
  const last3Months = sortedMonths.slice(-3)

  // Filtrer les problèmes avec récurrence dans les 3 derniers mois
  const filteredProblems = Object.keys(probTotal)
    .filter(prob => {
      const countLast3 = last3Months.reduce((sum, m) => sum + (probByMonth[prob]?.[m] || 0), 0)
      return countLast3 > 0
    })
    .map(prob => ({ name: prob, total: probTotal[prob] }))
    .sort((a, b) => b.total - a.total)

  // Construire les données mensuelles
  const monthlyData = {}
  filteredProblems.forEach(({ name }) => {
    monthlyData[name] = sortedMonths.map(m => probByMonth[name]?.[m] || 0)
  })

  // Données du jour
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let todayTickets = data.filter(r => {
    const d = new Date(r._date)
    d.setHours(0, 0, 0, 0)
    return d.getTime() === today.getTime()
  })

  let displayDate = today

  // Si pas de données aujourd'hui, prendre le dernier jour avec des données
  if (todayTickets.length === 0) {
    const datesWithData = [...new Set(data.map(r => r._date.getTime()))].sort((a, b) => b - a)
    if (datesWithData.length > 0) {
      const lastDate = new Date(datesWithData[0])
      lastDate.setHours(0, 0, 0, 0)
      displayDate = lastDate
      todayTickets = data.filter(r => {
        const d = new Date(r._date)
        d.setHours(0, 0, 0, 0)
        return d.getTime() === lastDate.getTime()
      })
    }
  }

  const todayProblems = todayTickets.map(r => ({
    urgence: r.urgency,
    categorie: r.category,
    probleme: r.problem,
    signalePar: r.reporter
  }))

  // Historique des 15 derniers jours
  const dataByDate = {}
  data.forEach(r => {
    const dateKey = r._date.toISOString().split('T')[0]
    dataByDate[dateKey] = (dataByDate[dateKey] || 0) + 1
  })

  const historyDates = []
  const historyCounts = []
  for (let i = 14; i >= 0; i--) {
    const d = new Date(displayDate)
    d.setDate(d.getDate() - i)
    const dateKey = d.toISOString().split('T')[0]
    historyDates.push(`${d.getDate()}/${d.getMonth() + 1}`)
    historyCounts.push(dataByDate[dateKey] || 0)
  }

  // Formatter les mois pour l'affichage
  const displayMonths = sortedMonths.map(m => {
    const [monthNum, year] = m.split('/')
    return `${MONTH_NAMES[monthNum]} ${year}`
  })

  // Formatter la date du jour
  const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' }
  const todayDateStr = displayDate.toLocaleDateString('fr-FR', dateOptions)

  return {
    months: displayMonths,
    monthlyData,
    today: {
      date: todayDateStr,
      tickets: todayProblems
    },
    history: {
      dates: historyDates,
      counts: historyCounts
    },
    lastUpdate: new Date().toLocaleString('fr-FR')
  }
}

// Endpoint API
app.get('/api/dashboard', async (req, res) => {
  try {
    const records = await fetchSheetData()
    const analysis = analyzeData(records)
    res.json(analysis)
  } catch (error) {
    console.error('Erreur:', error)
    res.status(500).json({ error: error.message })
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// ============================================
// ClickUp API Routes
// ============================================

// GET /api/clickup/tasks - Récupère toutes les tâches ClickUp pour la roadmap
app.get('/api/clickup/tasks', async (req, res) => {
  try {
    const { tasks, milestones, evenements, categoryHeights, taskHeight, todayPosition, todayLevel, months } = await fetchAllTasks()
    res.json({
      tasks,
      milestones,
      evenements,
      categoryHeights,
      taskHeight,
      todayPosition,
      todayLevel,
      months,
      lastSync: new Date().toISOString(),
      count: tasks.length,
      milestonesCount: milestones.length,
      evenementsCount: evenements.length
    })
  } catch (error) {
    console.error('Erreur ClickUp:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/clickup/test - Teste la connexion ClickUp
app.get('/api/clickup/test', async (req, res) => {
  try {
    const result = await testConnection()
    res.json(result)
  } catch (error) {
    console.error('Erreur test ClickUp:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================
// Database API Routes (PostgreSQL)
// ============================================

// GET /api/positions - Récupère les positions personnalisées
app.get('/api/positions', async (req, res) => {
  try {
    const positions = await getTaskPositions()
    res.json({ positions, count: Object.keys(positions).length })
  } catch (error) {
    console.error('Erreur lecture positions:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/positions - Sauvegarde les positions personnalisées
app.post('/api/positions', async (req, res) => {
  try {
    const { tasks } = req.body
    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ error: 'tasks array required' })
    }
    const result = await saveTaskPositions(tasks)
    res.json(result)
  } catch (error) {
    console.error('Erreur sauvegarde positions:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/positions - Réinitialise les positions
app.delete('/api/positions', async (req, res) => {
  try {
    const result = await resetTaskPositions()
    res.json(result)
  } catch (error) {
    console.error('Erreur reset positions:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/db/test - Teste la connexion à la base de données
app.get('/api/db/test', async (req, res) => {
  try {
    const result = await testDbConnection()
    res.json(result)
  } catch (error) {
    console.error('Erreur test DB:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================
// Spectacles API Routes
// ============================================

// GET /api/spectacles - Récupère les spectacles de la saison
app.get('/api/spectacles', (req, res) => {
  try {
    const data = getSpectacles()
    res.json(data)
  } catch (error) {
    console.error('Erreur spectacles:', error)
    res.status(500).json({ error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`API endpoint: http://localhost:${PORT}/api/dashboard`)
})
