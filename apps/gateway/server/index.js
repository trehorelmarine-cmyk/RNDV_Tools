import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '../../.env' })

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.GATEWAY_PORT || 3005

const isDev = process.env.NODE_ENV !== 'production'

const APPS = [
  {
    name: 'Roadmap',
    description: 'Roadmap projet avec integration ClickUp',
    icon: '🗺️',
    url: isDev ? 'http://localhost:5174' : '/roadmap',
    color: '#00D9A5',
  },
  {
    name: 'Spectacles',
    description: 'Planning spectacles saison 2025/2026',
    icon: '🎭',
    url: isDev ? 'http://localhost:5175' : '/spectacles',
    color: '#EA4335',
  },
  {
    name: 'Dashboard Support',
    description: 'Analyse des incidents billetterie depuis Google Sheets',
    icon: '📊',
    url: isDev ? 'http://localhost:5173' : '/dashboard',
    color: '#1a73e8',
  },
]

app.use(express.static(join(__dirname, '../client/src')))

app.get('/api/apps', (req, res) => {
  res.json(APPS)
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'gateway' })
})

app.get('*', (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RNDV Tools - Gateway</title>
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Rubik', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #F1F3F4;
      min-height: 100vh;
    }
    .nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 24px;
      height: 60px;
      background: #4630EA;
      color: #FFFFFF;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .nav__brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 18px;
      font-weight: 600;
      color: #FFFFFF;
      text-decoration: none;
    }
    .nav__brand img { height: 32px; filter: brightness(0) invert(1); }
    .nav__links { display: flex; gap: 8px; }
    .nav__link {
      padding: 8px 16px;
      border-radius: 8px;
      color: rgba(255,255,255,0.8);
      text-decoration: none;
      font-weight: 500;
      font-size: 14px;
      transition: all 0.2s ease;
    }
    .nav__link:hover {
      background: rgba(255,255,255,0.1);
      color: #FFFFFF;
    }
    .content {
      max-width: 900px;
      margin: 48px auto;
      padding: 0 24px;
    }
    h1 {
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #000;
    }
    .subtitle {
      color: #5F6368;
      font-size: 16px;
      margin-bottom: 32px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 20px;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      text-decoration: none;
      color: inherit;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      transition: all 0.2s ease;
      border: 1px solid #E8EAED;
    }
    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      border-color: #4630EA;
    }
    .card-icon {
      font-size: 32px;
      margin-bottom: 12px;
    }
    .card-name {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .card-desc {
      color: #5F6368;
      font-size: 14px;
      line-height: 1.5;
    }
    .card-badge {
      display: inline-block;
      margin-top: 12px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      color: white;
    }
  </style>
</head>
<body>
  <nav class="nav">
    <a href="/" class="nav__brand">
      <img src="/logo-rndv.png" alt="RNDV" onerror="this.style.display='none'" />
      <span>RNDV Tools</span>
    </a>
    <div class="nav__links">
      ${APPS.map(app => `<a href="${app.url}" class="nav__link">${app.name}</a>`).join('')}
    </div>
  </nav>
  <div class="content">
    <h1>Applications RNDV</h1>
    <p class="subtitle">Suite d'outils R&D Vente - Comedie-Francaise</p>
    <div class="grid">
      ${APPS.map(app => `
        <a href="${app.url}" class="card">
          <div class="card-icon">${app.icon}</div>
          <div class="card-name">${app.name}</div>
          <div class="card-desc">${app.description}</div>
          <span class="card-badge" style="background: ${app.color}">${app.name}</span>
        </a>
      `).join('')}
    </div>
  </div>
</body>
</html>`
  res.send(html)
})

app.listen(PORT, () => {
  console.log(`Gateway running on http://localhost:${PORT}`)
})
