import { Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard/Dashboard'
import Roadmap from './pages/Roadmap/Roadmap'
import './App.css'

function App() {
  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-brand">
          <img src="/logo-rndv.png" alt="RNDV" className="navbar-logo" />
          <span>RNDV Tools</span>
        </div>
        <div className="navbar-links">
          <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Dashboard
          </NavLink>
          <NavLink to="/roadmap" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Roadmap
          </NavLink>
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/roadmap" element={<Roadmap />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
