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
    image: 'RNDV_05-Illustration.png',
    url: isDev ? 'http://localhost:5174' : '/roadmap',
    color: '#00D9A5',
  },
  {
    name: 'Spectacles',
    description: 'Planning spectacles saison 2025/2026',
    image: 'RNDV_07-Illustration.png',
    url: isDev ? 'http://localhost:5175' : '/spectacles',
    color: '#EA4335',
  },
  {
    name: 'Dashboard Support',
    description: 'Analyse des incidents billetterie depuis Teams',
    image: 'RNDV_08-Illustration.png',
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
  <link rel="icon" href="/favicon.ico" type="image/x-icon">
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Rubik', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #FFFFFF;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 48px;
      height: 72px;
      background: #f7f7f7;
    }
    .nav__brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 28px;
      font-weight: 700;
      color: #000;
      text-decoration: none;
    }
    .nav__brand img { height: 48px; }
    .nav__links { display: flex; gap: 12px; }
    .nav__link {
      padding: 8px 16px;
      border-radius: 8px;
      color: #5F6368;
      text-decoration: none;
      font-weight: 500;
      font-size: 14px;
      transition: all 0.2s ease;
    }
    .nav__link:hover {
      color: #4630EA;
    }
    .content {
      max-width: 1000px;
      margin: 0 auto;
      padding: 0 48px;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    h1 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 28px;
      color: #000;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }
    @media (max-width: 900px) {
      .grid { grid-template-columns: 1fr; }
      .nav { padding: 0 24px; }
      .content { padding: 0 24px; margin-top: 40px; }
      h1 { font-size: 28px; margin-bottom: 32px; }
    }
    .card {
      background: #FFFFFF;
      border-radius: 16px;
      padding: 24px 24px;
      text-decoration: none;
      color: inherit;
      transition: all 0.25s ease;
      border: 1px solid #E8EAED;
      display: flex;
      flex-direction: column;
    }
    .card:hover {
      transform: translateY(-6px);
      box-shadow: 0 12px 32px rgba(0,0,0,0.1);
      border-color: #00D9A5;
    }
    .card-image {
      width: 100%;
      height: 140px;
      object-fit: contain;
      margin-bottom: 16px;
    }
    .card-name {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 10px;
      color: #000;
    }
    .card-desc {
      color: #5F6368;
      font-size: 14px;
      line-height: 1.6;
      flex: 1;
    }
    .card-cta {
      display: inline-block;
      margin-top: 14px;
      padding: 12px 28px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #FFFFFF;
      background: #4630EA;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      transition: background 0.2s ease;
      text-align: center;
    }
    .card:hover .card-cta {
      background: #3520c5;
    }
  </style>
</head>
<body>
  <nav class="nav">
    <a href="/" class="nav__brand">
      <img src="/logo-rndv.png" alt="RNDV" onerror="this.style.display='none'" />
    </a>
    <div class="nav__links">
      ${APPS.map(app => `<a href="${app.url}" class="nav__link">${app.name}</a>`).join('')}
    </div>
  </nav>
  <div class="content">
    <h1>Applications RNDV</h1>
    <div class="grid">
      ${APPS.map(app => `
        <a href="${app.url}" class="card">
          <img src="/${app.image}" alt="${app.name}" class="card-image" />
          <div class="card-name">${app.name}</div>
          <div class="card-desc">${app.description}</div>
          <span class="card-cta">En savoir plus</span>
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
