import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SharedNav } from '@rndv/shared'
import Dashboard from './pages/Dashboard/Dashboard.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <SharedNav appName="Dashboard Support" />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </main>
    </BrowserRouter>
  </StrictMode>
)
