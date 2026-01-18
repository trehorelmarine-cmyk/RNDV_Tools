/**
 * RNDV Server
 * Serveur Node.js pour héberger les applications RNDV
 *
 * @version 1.0.0
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration PostgreSQL
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'rndv',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
});

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ============================================
// STATIC FILES - Applications
// ============================================

// Roadmap Application
app.use('/roadmap', express.static(path.join(__dirname, '..', 'client', 'Roadmap')));

// Analyse Demande RNDV Application
app.use('/analyse', express.static(path.join(__dirname, '..', 'client', 'analyse_demande_rndv')));

// Redirect root to roadmap
app.get('/', (req, res) => {
    res.redirect('/roadmap/roadmap.html');
});

// ============================================
// API ROUTES - Tasks
// ============================================

/**
 * GET /api/tasks
 * Récupère toutes les tâches
 */
app.get('/api/tasks', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM tasks ORDER BY row_name, "left"'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur GET /api/tasks:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des tâches' });
    }
});

/**
 * GET /api/tasks/:id
 * Récupère une tâche par son ID
 */
app.get('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM tasks WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tâche non trouvée' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erreur GET /api/tasks/:id:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération de la tâche' });
    }
});

/**
 * POST /api/tasks
 * Crée une nouvelle tâche
 */
app.post('/api/tasks', async (req, res) => {
    try {
        const { id, row_name, name, type, left, top, width, info, delivered, priority } = req.body;

        const result = await pool.query(
            `INSERT INTO tasks (id, row_name, name, type, "left", top, width, info, delivered, priority)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [id, row_name, name, type, left, top, width, info, delivered || false, priority || false]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erreur POST /api/tasks:', error);
        res.status(500).json({ error: 'Erreur lors de la création de la tâche' });
    }
});

/**
 * PUT /api/tasks/:id
 * Met à jour une tâche
 */
app.put('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { row_name, name, type, left, top, width, info, delivered, priority } = req.body;

        const result = await pool.query(
            `UPDATE tasks
             SET row_name = $1, name = $2, type = $3, "left" = $4, top = $5,
                 width = $6, info = $7, delivered = $8, priority = $9, updated_at = NOW()
             WHERE id = $10
             RETURNING *`,
            [row_name, name, type, left, top, width, info, delivered || false, priority || false, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tâche non trouvée' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erreur PUT /api/tasks/:id:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour de la tâche' });
    }
});

/**
 * PATCH /api/tasks/:id/position
 * Met à jour uniquement la position d'une tâche (drag & drop)
 */
app.patch('/api/tasks/:id/position', async (req, res) => {
    try {
        const { id } = req.params;
        const { left, top, width } = req.body;

        const result = await pool.query(
            `UPDATE tasks
             SET "left" = COALESCE($1, "left"),
                 top = COALESCE($2, top),
                 width = COALESCE($3, width),
                 updated_at = NOW()
             WHERE id = $4
             RETURNING *`,
            [left, top, width, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tâche non trouvée' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erreur PATCH /api/tasks/:id/position:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour de la position' });
    }
});

/**
 * DELETE /api/tasks/:id
 * Supprime une tâche
 */
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM tasks WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tâche non trouvée' });
        }

        res.json({ message: 'Tâche supprimée', task: result.rows[0] });
    } catch (error) {
        console.error('Erreur DELETE /api/tasks/:id:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression de la tâche' });
    }
});

/**
 * POST /api/tasks/bulk
 * Sauvegarde toutes les tâches en une fois (remplace toutes les tâches existantes)
 */
app.post('/api/tasks/bulk', async (req, res) => {
    const client = await pool.connect();

    try {
        const { tasks } = req.body;

        await client.query('BEGIN');

        // Supprimer toutes les tâches existantes
        await client.query('DELETE FROM tasks');

        // Insérer les nouvelles tâches
        for (const task of tasks) {
            await client.query(
                `INSERT INTO tasks (id, row_name, name, type, "left", top, width, info, delivered, priority)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [task.id, task.row, task.name, task.type, task.left, task.top, task.width, task.info, task.delivered || false, task.priority || false]
            );
        }

        await client.query('COMMIT');

        res.json({ message: 'Tâches sauvegardées', count: tasks.length });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erreur POST /api/tasks/bulk:', error);
        res.status(500).json({ error: 'Erreur lors de la sauvegarde des tâches' });
    } finally {
        client.release();
    }
});

/**
 * POST /api/tasks/reset
 * Réinitialise les tâches avec les données initiales
 */
app.post('/api/tasks/reset', async (req, res) => {
    const client = await pool.connect();

    try {
        const { tasks } = req.body;

        await client.query('BEGIN');
        await client.query('DELETE FROM tasks');

        for (const task of tasks) {
            await client.query(
                `INSERT INTO tasks (id, row_name, name, type, "left", top, width, info, delivered, priority)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [task.id, task.row, task.name, task.type, task.left, task.top, task.width, task.info, task.delivered || false, task.priority || false]
            );
        }

        await client.query('COMMIT');

        res.json({ message: 'Tâches réinitialisées', count: tasks.length });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erreur POST /api/tasks/reset:', error);
        res.status(500).json({ error: 'Erreur lors de la réinitialisation des tâches' });
    } finally {
        client.release();
    }
});

// ============================================
// API ROUTES - Milestones
// ============================================

/**
 * GET /api/milestones
 * Récupère tous les jalons
 */
app.get('/api/milestones', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM milestones ORDER BY position'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur GET /api/milestones:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des jalons' });
    }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            database: 'disconnected',
            error: error.message
        });
    }
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((req, res) => {
    res.status(404).json({ error: 'Route non trouvée' });
});

app.use((error, req, res, next) => {
    console.error('Erreur serveur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                    RNDV Server v1.0.0                      ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log(`║  Serveur démarré sur le port ${PORT}                           ║`);
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║  Applications disponibles:                                 ║');
    console.log(`║  - Roadmap:     http://localhost:${PORT}/roadmap/roadmap.html   ║`);
    console.log(`║  - Analyse:     http://localhost:${PORT}/analyse/rapport_evolution.html ║`);
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║  API Endpoints:                                            ║');
    console.log(`║  - GET    /api/tasks          - Liste des tâches          ║`);
    console.log(`║  - POST   /api/tasks          - Créer une tâche           ║`);
    console.log(`║  - PUT    /api/tasks/:id      - Modifier une tâche        ║`);
    console.log(`║  - PATCH  /api/tasks/:id/position - Modifier position     ║`);
    console.log(`║  - DELETE /api/tasks/:id      - Supprimer une tâche       ║`);
    console.log(`║  - POST   /api/tasks/bulk     - Sauvegarder toutes        ║`);
    console.log(`║  - POST   /api/tasks/reset    - Réinitialiser             ║`);
    console.log(`║  - GET    /api/health         - État du serveur           ║`);
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
});

module.exports = app;
