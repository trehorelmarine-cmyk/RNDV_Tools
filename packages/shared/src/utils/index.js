/**
 * Format a date to French locale string
 */
export function formatDateFR(date) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Build API URL with base path
 */
export function buildApiUrl(path, baseUrl) {
  const base = baseUrl || ''
  return `${base}${path}`
}
