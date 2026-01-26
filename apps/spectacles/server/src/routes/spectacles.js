import { Router } from 'express'
import { getSpectacles } from '../services/spectacles.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const data = getSpectacles()
    res.json(data)
  } catch (error) {
    console.error('Spectacles API error:', error)
    res.status(500).json({ error: error.message })
  }
})

export { router as spectaclesRoutes }
