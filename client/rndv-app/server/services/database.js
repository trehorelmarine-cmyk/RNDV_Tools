/**
 * Database Service - PostgreSQL
 * Gère la persistance des positions des tâches
 */

import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'rndv',
  user: process.env.DB_USER || 'handsagency',
  password: process.env.DB_PASSWORD || ''
})

/**
 * Récupère les positions personnalisées des tâches
 */
export async function getTaskPositions() {
  const result = await pool.query(`
    SELECT id, "left", top, width
    FROM tasks
    WHERE "left" IS NOT NULL
  `)

  const positions = {}
  for (const row of result.rows) {
    positions[row.id] = {
      left: row.left,
      top: row.top,
      width: row.width
    }
  }
  return positions
}

/**
 * Sauvegarde les positions personnalisées des tâches
 */
export async function saveTaskPositions(tasks) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    for (const task of tasks) {
      // Upsert: insert ou update si existe
      await client.query(`
        INSERT INTO tasks (id, row_name, name, type, "left", top, width, delivered, priority, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (id) DO UPDATE SET
          "left" = EXCLUDED."left",
          top = EXCLUDED.top,
          width = EXCLUDED.width,
          updated_at = NOW()
      `, [
        task.id,
        task.row || task.type || 'unknown',
        task.name || 'Unknown',
        task.type || 'unknown',
        task.left,
        task.top || 0,
        task.width,
        task.delivered || false,
        task.priority || false
      ])
    }

    await client.query('COMMIT')
    return { success: true, count: tasks.length }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Réinitialise les positions (supprime toutes les entrées)
 */
export async function resetTaskPositions() {
  await pool.query('DELETE FROM tasks')
  return { success: true }
}

/**
 * Test de connexion à la base de données
 */
export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()')
    return {
      connected: true,
      timestamp: result.rows[0].now
    }
  } catch (error) {
    return {
      connected: false,
      error: error.message
    }
  }
}

export default pool
