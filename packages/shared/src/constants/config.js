export const APP_CONFIG = {
  gateway: {
    name: 'Gateway',
    port: 3005,
    path: '/',
  },
  dashboard: {
    name: 'Dashboard Support',
    port: { client: 5173, server: 3001 },
    path: '/dashboard',
  },
  roadmap: {
    name: 'Roadmap',
    port: { client: 5174, server: 3002 },
    path: '/roadmap',
  },
  spectacles: {
    name: 'Spectacles',
    port: { client: 5175, server: 3003 },
    path: '/spectacles',
  },
}

export const GATEWAY_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GATEWAY_URL) || 'http://localhost:3005'
