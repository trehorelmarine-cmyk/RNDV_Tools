import { Router } from 'express'
import { parse } from 'csv-parse/sync'

const router = Router()

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || '1E9y9HRCBd41nXdTRYZ9yCRaLg6JGGHye5WvaiTiC-C0'
const GOOGLE_SHEET_GID = process.env.GOOGLE_SHEET_GID || '692995836'
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=csv&gid=${GOOGLE_SHEET_GID}`

router.get('/', async (req, res) => {
  try {
    const response = await fetch(SHEET_URL)
    if (!response.ok) throw new Error('Failed to fetch Google Sheet')
    const csvText = await response.text()

    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true
    })

    // Normalize date to DD/MM/YYYY with zero-padded values
    const normalizeDate = (dateStr) => {
      const parts = dateStr.split('/')
      if (parts.length !== 3) return dateStr
      const [d, m, y] = parts
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
    }

    // Parse dates and build analytics
    const monthlyData = {}
    const monthSet = new Set()
    const history = { dates: [], counts: [] }
    const today = new Date()
    const todayStr = today.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

    const todayTickets = []
    const last15Days = {}

    records.forEach(record => {
      const rawDate = record['DATE'] || record['Date'] || record['date'] || ''
      const problem = record['PROBLÈME'] || record['Problème'] || record['probleme'] || ''
      const urgence = record['URGENCE / IMPACT'] || record['Urgence'] || record['urgence'] || 'N/A'

      if (!rawDate || !problem) return

      const date = normalizeDate(rawDate)

      // Parse date DD/MM/YYYY
      const [day, month, year] = date.split('/')
      if (!day || !month || !year) return

      const monthKey = `${month}/${year}`
      monthSet.add(monthKey)

      if (!monthlyData[problem]) monthlyData[problem] = {}
      if (!monthlyData[problem][monthKey]) monthlyData[problem][monthKey] = 0
      monthlyData[problem][monthKey]++

      // Today's tickets
      if (date === todayStr) {
        todayTickets.push({ probleme: problem, urgence })
      }

      // Last 15 days
      const recordDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      const diffDays = Math.floor((today - recordDate) / (1000 * 60 * 60 * 24))
      if (diffDays >= 0 && diffDays < 15) {
        const shortDate = `${day}/${month}`
        if (!last15Days[shortDate]) last15Days[shortDate] = 0
        last15Days[shortDate]++
      }
    })

    // Sort months chronologically
    const sortedMonths = [...monthSet].sort((a, b) => {
      const [ma, ya] = a.split('/')
      const [mb, yb] = b.split('/')
      return (parseInt(ya) * 12 + parseInt(ma)) - (parseInt(yb) * 12 + parseInt(mb))
    })

    // Keep last 3 months only and filter problems with occurrences
    const recentMonths = sortedMonths.slice(-3)
    const filteredMonthlyData = {}

    Object.entries(monthlyData).forEach(([problem, data]) => {
      const values = recentMonths.map(m => data[m] || 0)
      const total = values.reduce((a, b) => a + b, 0)
      if (total > 0) {
        filteredMonthlyData[problem] = values
      }
    })

    // Build history for last 15 days
    const historyDates = []
    const historyCounts = []
    for (let i = 14; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
      historyDates.push(key)
      historyCounts.push(last15Days[key] || 0)
    }

    res.json({
      months: recentMonths,
      monthlyData: filteredMonthlyData,
      today: {
        date: todayStr,
        tickets: todayTickets
      },
      history: {
        dates: historyDates,
        counts: historyCounts
      },
      lastUpdate: new Date().toISOString()
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    res.status(500).json({ error: error.message })
  }
})

export { router as dashboardRoutes }
