import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { clickupRoutes } from './routes/clickup.js'
import { positionsRoutes } from './routes/positions.js'

dotenv.config({ path: '../../../.env' })

const app = express()
const PORT = process.env.ROADMAP_PORT || 3002

app.use(cors())
app.use(express.json())

app.use('/api/clickup', clickupRoutes)
app.use('/api/positions', positionsRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'roadmap' })
})

app.listen(PORT, () => {
  console.log('Roadmap server running on port ' + PORT)
})
