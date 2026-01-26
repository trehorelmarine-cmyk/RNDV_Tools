import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SharedNav } from '@rndv/shared'
import Roadmap from './pages/Roadmap/Roadmap.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <SharedNav appName="Roadmap" />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Roadmap />} />
        </Routes>
      </main>
    </BrowserRouter>
  </StrictMode>
)
