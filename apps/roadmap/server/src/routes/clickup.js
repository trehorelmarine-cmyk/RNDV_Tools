import { Router } from 'express'
import { fetchAllTasks } from '../services/clickup.js'

const router = Router()

router.get('/tasks', async (req, res) => {
  try {
    const data = await fetchAllTasks()
    res.json(data)
  } catch (error) {
    console.error('ClickUp API error:', error)
    res.status(500).json({ error: error.message })
  }
})

export { router as clickupRoutes }
