import { Router } from 'express'
import { getTaskPositions, saveTaskPositions, resetTaskPositions } from '../services/database.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const positions = await getTaskPositions()
    res.json({ positions })
  } catch (error) {
    console.error('Get positions error:', error)
    res.status(500).json({ error: error.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { tasks } = req.body
    await saveTaskPositions(tasks)
    res.json({ success: true })
  } catch (error) {
    console.error('Save positions error:', error)
    res.status(500).json({ error: error.message })
  }
})

router.delete('/', async (req, res) => {
  try {
    await resetTaskPositions()
    res.json({ success: true })
  } catch (error) {
    console.error('Delete positions error:', error)
    res.status(500).json({ error: error.message })
  }
})

export { router as positionsRoutes }
