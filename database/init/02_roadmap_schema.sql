-- ============================================
-- ROADMAP Schema
-- ============================================

\c rndv

-- Tasks table (roadmap timeline)
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(50) PRIMARY KEY,
    row_name VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    "left" INTEGER NOT NULL DEFAULT 0,
    top INTEGER NOT NULL DEFAULT 0,
    width INTEGER NOT NULL DEFAULT 100,
    info TEXT,
    delivered BOOLEAN DEFAULT FALSE,
    priority BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_row ON tasks(row_name);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);

-- Milestones table
CREATE TABLE IF NOT EXISTS milestones (
    id SERIAL PRIMARY KEY,
    date VARCHAR(10) NOT NULL,
    label VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT 'blue',
    level INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task history (audit)
CREATE TABLE IF NOT EXISTS task_history (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_changed_at ON task_history(changed_at);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Seed milestones
INSERT INTO milestones (date, label, position, color, level) VALUES
    ('21/01', 'BIS Nantes', 170, 'blue', 1),
    ('27/02', 'Go Prod', 290, 'blue', 2),
    ('21/03', 'PUBLICS XP', 370, 'green', 3),
    ('26/03', 'SITEM', 430, 'green', 1),
    ('23-30/06', 'MEV 26-27', 680, 'red', 1);

SELECT 'Roadmap schema initialized' AS status;
