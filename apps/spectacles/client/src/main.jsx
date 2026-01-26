import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SharedNav } from '@rndv/shared'
import Spectacles from './pages/Spectacles/Spectacles.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <SharedNav appName="Spectacles" />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Spectacles />} />
        </Routes>
      </main>
    </BrowserRouter>
  </StrictMode>
)
