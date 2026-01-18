-- ============================================
-- RNDV Database Schema
-- Base de données PostgreSQL pour le planning RNDV
-- ============================================

-- Créer la base de données (exécuter séparément si nécessaire)
-- CREATE DATABASE rndv;

-- Se connecter à la base de données rndv avant d'exécuter le reste
-- \c rndv

-- ============================================
-- TABLE: tasks
-- Stocke les tâches du planning Gantt
-- ============================================

DROP TABLE IF EXISTS tasks CASCADE;

CREATE TABLE tasks (
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

-- Index pour améliorer les performances
CREATE INDEX idx_tasks_row ON tasks(row_name);
CREATE INDEX idx_tasks_type ON tasks(type);

-- Commentaires
COMMENT ON TABLE tasks IS 'Tâches du planning Gantt RNDV';
COMMENT ON COLUMN tasks.id IS 'Identifiant unique de la tâche (ex: task-1)';
COMMENT ON COLUMN tasks.row_name IS 'Catégorie de la tâche (pac, rapports, vente, billetterie, pmo, commercialisation)';
COMMENT ON COLUMN tasks.name IS 'Nom affiché de la tâche';
COMMENT ON COLUMN tasks.type IS 'Type visuel (pac, rapports, vente, etc. ou variante -light)';
COMMENT ON COLUMN tasks."left" IS 'Position horizontale en pixels';
COMMENT ON COLUMN tasks.top IS 'Position verticale en pixels dans la ligne';
COMMENT ON COLUMN tasks.width IS 'Largeur en pixels (durée)';
COMMENT ON COLUMN tasks.info IS 'Description/tooltip de la tâche';
COMMENT ON COLUMN tasks.delivered IS 'Indicateur livraison maintenue';
COMMENT ON COLUMN tasks.priority IS 'Indicateur prioritaire';

-- ============================================
-- TABLE: milestones
-- Stocke les jalons du planning
-- ============================================

DROP TABLE IF EXISTS milestones CASCADE;

CREATE TABLE milestones (
    id SERIAL PRIMARY KEY,
    date VARCHAR(10) NOT NULL,
    label VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT 'blue',
    level INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Commentaires
COMMENT ON TABLE milestones IS 'Jalons du planning RNDV';
COMMENT ON COLUMN milestones.date IS 'Date affichée (ex: 21/01)';
COMMENT ON COLUMN milestones.label IS 'Nom de l événement';
COMMENT ON COLUMN milestones.position IS 'Position horizontale en pixels';
COMMENT ON COLUMN milestones.color IS 'Couleur (blue, green, red)';
COMMENT ON COLUMN milestones.level IS 'Niveau de positionnement vertical (1, 2, 3)';

-- ============================================
-- TABLE: task_history
-- Historique des modifications (optionnel)
-- ============================================

DROP TABLE IF EXISTS task_history CASCADE;

CREATE TABLE task_history (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour l'historique
CREATE INDEX idx_task_history_task_id ON task_history(task_id);
CREATE INDEX idx_task_history_changed_at ON task_history(changed_at);

COMMENT ON TABLE task_history IS 'Historique des modifications des tâches';

-- ============================================
-- DONNÉES INITIALES - Milestones
-- ============================================

INSERT INTO milestones (date, label, position, color, level) VALUES
    ('21/01', 'BIS Nantes', 170, 'blue', 1),
    ('27/02', 'Go Prod', 290, 'blue', 2),
    ('21/03', 'PUBLICS XP', 370, 'green', 3),
    ('26/03', 'SITEM', 430, 'green', 1),
    ('23-30/06', 'MEV 26-27', 680, 'red', 1);

-- ============================================
-- DONNÉES INITIALES - Tasks
-- ============================================

INSERT INTO tasks (id, row_name, name, type, "left", top, width, info, delivered, priority) VALUES
    -- PAC
    ('task-1', 'pac', 'Préparation HLM', 'pac', 10, 45, 140, 'Préparation HLM - Décembre à Janvier', FALSE, FALSE),
    ('task-2', 'pac', 'Accompagnement HLM', 'pac', 151, 45, 584, 'Accompagnement HLM - 14 janvier au 11 juillet', FALSE, FALSE),
    ('task-3', 'pac', 'Préparation et ouverture de saison', 'pac', 450, 85, 227, 'Préparation et ouverture de saison - Mi-avril au 23 juin', FALSE, FALSE),
    ('task-8', 'pac', 'Préparation et ouverture de saison', 'pac', 1150, 85, 215, 'Préparation et ouverture de saison - Mi-novembre 2026 au 20 janvier 2027', FALSE, FALSE),

    -- RAPPORTS
    ('task-4', 'rapports', 'Rapports lot 3', 'rapports', 5, 45, 95, 'Rapports lot 3 - 1er au 31 décembre 2025', TRUE, FALSE),
    ('task-5', 'rapports', 'Ventilation recettes', 'rapports', 280, 45, 120, 'Ventilation des recettes - 23 février au 1er avril 2026', FALSE, TRUE),
    ('task-6', 'rapports', 'Factur-X (Chorus pro)', 'rapports', 440, 45, 220, 'Factur-X niveau minimum (Chorus pro) - 13 avril au 19 juin 2026', FALSE, TRUE),
    ('task-7', 'rapports', 'Conformité comptable', 'rapports', 5, 85, 290, 'Rapports et conformité comptable - Structure des rapports et correction problèmes déjà identifiés - 1er décembre 2025 au 27 février 2026', FALSE, TRUE),

    -- VENTE
    ('task-9', 'vente', 'Exports PDF', 'vente', 5, 5, 95, 'Gestion exports PDF - 1er au 31 décembre 2025', TRUE, FALSE),
    ('task-12', 'vente', 'Optimisation BOCA', 'vente', 5, 45, 252, 'Optimisation BOCA - 1er décembre 2025 au 16 février 2026', FALSE, FALSE),
    ('task-10', 'vente', 'Landing promo', 'vente', 303, 5, 164, 'Landing offre promo - 2 mars au 20 avril 2026', FALSE, TRUE),
    ('task-13', 'vente', 'Caisse rapide', 'vente', 405, 45, 258, 'Caisse rapide - 1er avril au 19 juin 2026', FALSE, FALSE),
    ('task-11', 'vente', 'Autonomie param.', 'vente', 555, 5, 145, 'Autonomie paramétrage - 18 mai au 30 juin 2026', FALSE, TRUE),
    ('task-14', 'vente', 'Package prestations', 'vente-light', 400, 85, 150, 'Package et prestations datées', FALSE, FALSE),
    ('task-15', 'vente', 'Ventes croisées L1', 'vente-light', 500, 125, 140, 'Ventes croisées et méthodes de livraison LOT 1 (TBC)', FALSE, FALSE),
    ('task-16', 'vente', 'Ventes croisées L2', 'vente-light', 650, 125, 140, 'Ventes croisées et méthodes de livraison LOT 2 (TBC)', FALSE, FALSE),

    -- GESTION BILLETTERIE
    ('task-17', 'billetterie', 'Écran client caisse', 'billetterie-light', 700, 5, 150, 'Écran client caisse', FALSE, FALSE),
    ('task-18', 'billetterie', 'Permissions opérateurs', 'billetterie-light', 800, 45, 170, 'Permissions fines des opérateurs', FALSE, FALSE),
    ('task-19', 'billetterie', 'Liste d''attente', 'billetterie-light', 800, 85, 120, 'Liste d''attente', FALSE, FALSE),
    ('task-20', 'billetterie', 'Prép. Interface revendeurs', 'billetterie-light', 400, 125, 180, 'Préparation Interface revendeurs (Contractualisation CF faite avec les revendeurs définis, ateliers techniques réalisés)', FALSE, FALSE),
    ('task-21', 'billetterie', 'Interface revendeurs', 'billetterie-light', 800, 125, 150, 'Interface revendeurs', FALSE, FALSE),

    -- PMO
    ('task-22', 'pmo', 'Prépa ateliers', 'pmo', 10, 25, 110, 'Préparation ateliers de spécification fonctionnelle', FALSE, FALSE),
    ('task-23', 'pmo', 'Ateliers spécif.', 'pmo', 130, 25, 120, 'Ateliers de spécifications fonctionnelles', FALSE, FALSE),
    ('task-24', 'pmo', 'Rédaction spécif.', 'pmo', 130, 65, 140, 'Rédaction spécifications', FALSE, FALSE),
    ('task-25', 'pmo', 'Cadrage doc.', 'pmo', 130, 105, 110, 'Cadrage documentaire RNDV', FALSE, FALSE),
    ('task-26', 'pmo', 'Manuel RNDV', 'pmo', 250, 105, 120, 'Rédaction MANUEL RNDV', FALSE, FALSE),

    -- COMMERCIALISATION
    ('task-27', 'commercialisation', 'Cadrage PITCH', 'commercialisation', 10, 25, 120, 'Cadrage PITCH RNDV', FALSE, FALSE),
    ('task-28', 'commercialisation', 'Rédaction PITCH', 'commercialisation', 140, 25, 130, 'Rédaction PITCH RNDV', FALSE, FALSE),
    ('task-29', 'commercialisation', 'Contact revendeurs', 'commercialisation', 280, 25, 140, 'Contact revendeurs', FALSE, FALSE),
    ('task-30', 'commercialisation', 'Prospects HLM', 'commercialisation', 10, 65, 120, 'Rencontre prospects HLM', FALSE, FALSE),
    ('task-31', 'commercialisation', 'Follow UP BIS/MC', 'commercialisation', 140, 65, 130, 'Follow UP BIS / MC', FALSE, FALSE),
    ('task-32', 'commercialisation', 'SaaS RNDV One', 'commercialisation', 280, 65, 120, 'Cadrage plateforme SaaS RNDV One', FALSE, FALSE),
    ('task-33', 'commercialisation', 'Newsletter RNDV', 'commercialisation', 10, 105, 140, 'Cadrage Newsletter RNDV', FALSE, FALSE);

-- ============================================
-- FONCTION: trigger pour updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at automatiquement
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Afficher le nombre de tâches insérées
SELECT 'Tâches insérées: ' || COUNT(*) FROM tasks;
SELECT 'Jalons insérés: ' || COUNT(*) FROM milestones;
