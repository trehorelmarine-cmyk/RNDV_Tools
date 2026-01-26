import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { spectaclesRoutes } from './routes/spectacles.js'

dotenv.config({ path: '../../../.env' })

const app = express()
const PORT = process.env.SPECTACLES_PORT || 3003

app.use(cors())
app.use(express.json())

app.use('/api/spectacles', spectaclesRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'spectacles' })
})

app.listen(PORT, () => {
  console.log(`Spectacles server running on http://localhost:${PORT}`)
})
