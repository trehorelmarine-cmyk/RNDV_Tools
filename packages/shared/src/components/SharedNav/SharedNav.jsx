import { APP_CONFIG, GATEWAY_URL } from '../../constants/index.js'
import './SharedNav.css'

const NAV_APPS = [
  { key: 'roadmap', label: 'Roadmap' },
  { key: 'spectacles', label: 'Spectacles' },
  { key: 'dashboard', label: 'Dashboard support' },
]

function getAppUrl(config, isDev) {
  if (isDev) {
    const clientPort = typeof config.port === 'object' ? config.port.client : config.port
    return `http://localhost:${clientPort}`
  }
  return config.path
}

export function SharedNav({ appName }) {
  const isDev = import.meta.env?.DEV || false

  return (
    <nav className="shared-nav">
      <div className="shared-nav__brand">
        <a href={isDev ? `http://localhost:${APP_CONFIG.gateway.port}` : '/'} className="shared-nav__home">
          <img src="/logo-rndv.png" alt="RNDV" className="shared-nav__logo" />
          <span>{appName || 'RNDV Tools'}</span>
        </a>
      </div>
      <div className="shared-nav__links">
        {NAV_APPS.map(({ key, label }) => {
          const config = APP_CONFIG[key]
          const isCurrentApp = appName === config.name
          const href = isCurrentApp ? '/' : getAppUrl(config, isDev)

          return (
            <a
              key={key}
              href={href}
              className={`shared-nav__link ${isCurrentApp ? 'shared-nav__link--active' : ''}`}
            >
              {label}
            </a>
          )
        })}
      </div>
    </nav>
  )
}
