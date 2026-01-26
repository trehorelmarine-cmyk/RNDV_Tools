import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { dashboardRoutes } from './routes/dashboard.js'

dotenv.config({ path: '../../../.env' })

const app = express()
const PORT = process.env.DASHBOARD_PORT || 3001

app.use(cors())
app.use(express.json())

app.use('/api/dashboard', dashboardRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'dashboard' })
})

app.listen(PORT, () => {
  console.log(`Dashboard server running on http://localhost:${PORT}`)
})
