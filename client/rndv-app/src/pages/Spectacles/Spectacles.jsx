import { useState, useEffect } from 'react'
import './Spectacles.css'

const API_URL = import.meta.env.VITE_API_URL || ''

function Spectacles() {
  const [shows, setShows] = useState([])
  const [months, setMonths] = useState([])
  const [todayPosition, setTodayPosition] = useState(null)
  const [monthWidth, setMonthWidth] = useState(150)
  const [venueColors, setVenueColors] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [venueFilter, setVenueFilter] = useState('all')

  useEffect(() => {
    fetchSpectacles()
  }, [])

  const fetchSpectacles = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/spectacles`)
      if (!response.ok) throw new Error('Erreur API')
      const data = await response.json()
      setShows(data.shows)
      setMonths(data.months)
      setTodayPosition(data.todayPosition)
      setMonthWidth(data.monthWidth)
      setVenueColors(data.venueColors)
    } catch (error) {
      console.error('Erreur chargement spectacles:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="spectacles-page">
        <div className="spectacles-loader">
          <div className="loader-spinner"></div>
          <p>Chargement des spectacles...</p>
        </div>
      </div>
    )
  }

  const totalWidth = months.length * monthWidth

  // Venues uniques (ordre d'apparition)
  const uniqueVenues = [...new Set(shows.map(s => s.venue))]

  // Filtrer les spectacles par salle
  const filteredShows = venueFilter === 'all'
    ? shows
    : shows.filter(s => s.venue === venueFilter)

  return (
    <div className="spectacles-page">
      <div className="spectacles-toolbar">
        <div className="spectacles-toolbar__left">
          <h2 className="spectacles-title">Planning Spectacles - Saison 2025/2026</h2>
          <div className="spectacles-filter">
            <label className="spectacles-filter__label">Salle :</label>
            <select
              className="spectacles-filter__select"
              value={venueFilter}
              onChange={(e) => setVenueFilter(e.target.value)}
            >
              <option value="all">Toutes les salles</option>
              {uniqueVenues.map(venue => (
                <option key={venue} value={venue}>{venue}</option>
              ))}
            </select>
          </div>
        </div>
        <a
          href="https://reserver.comedie-francaise.fr/"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--secondary"
        >
          Voir sur reserver.comedie-francaise.fr
        </a>
      </div>

      <div className="spectacles-container">
        <div className="spectacles-timeline">
          {/* Sidebar */}
          <aside className="spectacles-sidebar">
            <div className="spectacles-header-space"></div>
            {filteredShows.map(show => (
              <div key={show.id} className="spectacles-sidebar__row">
                <div className="spectacles-sidebar__title">{show.title}</div>
                <div
                  className="spectacles-sidebar__venue"
                  style={{ color: show.color }}
                >
                  {show.venue}
                </div>
              </div>
            ))}
          </aside>

          {/* Gantt Area */}
          <div className="spectacles-gantt" style={{ width: totalWidth }}>
            {/* Header */}
            <div className="spectacles-gantt__header">
              {/* Today label row */}
              <div className="spectacles-today-row">
                {todayPosition !== null && (
                  <>
                    <div
                      className="spectacles-today__label"
                      style={{ left: todayPosition }}
                    >
                      Aujourd'hui
                    </div>
                    <div
                      className="spectacles-today__connector"
                      style={{ left: todayPosition }}
                    />
                  </>
                )}
              </div>

              {/* Months row */}
              <div className="spectacles-months-row">
                {months.map((month, index) => (
                  <div key={index} className="spectacles-month" style={{ width: monthWidth }}>
                    {month.name} {month.year}
                  </div>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="spectacles-gantt__content">
              {/* Today line */}
              {todayPosition !== null && (
                <div
                  className="spectacles-today__line"
                  style={{ left: todayPosition }}
                />
              )}

              {/* Rows */}
              {filteredShows.map(show => (
                <div key={show.id} className="spectacles-row">
                  {/* Grid cells */}
                  {months.map((_, idx) => (
                    <div key={idx} className="spectacles-cell" style={{ width: monthWidth }} />
                  ))}

                  {/* Show bar */}
                  <div
                    className="spectacles-bar"
                    style={{
                      left: show.left,
                      width: show.width,
                      backgroundColor: show.color
                    }}
                  >
                    <div className="spectacles-bar__content">
                      <span className="spectacles-bar__name">{show.title}</span>
                    </div>
                    {/* Start date + time label */}
                    <div className="spectacles-bar__date spectacles-bar__date--start">
                      <span className="spectacles-bar__date-text">{show.startDateFormatted}</span>
                      {show.firstShowTime && (
                        <span className="spectacles-bar__time">{show.firstShowTime}</span>
                      )}
                    </div>
                    {/* End date label */}
                    <div className="spectacles-bar__date spectacles-bar__date--end">
                      {show.endDateFormatted}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="spectacles-legend">
          <div className="spectacles-legend__title">Salles</div>
          <div className="spectacles-legend__items">
            {uniqueVenues.map(venue => (
              <div key={venue} className="spectacles-legend__item">
                <div
                  className="spectacles-legend__dot"
                  style={{ backgroundColor: venueColors[venue] || '#6B7280' }}
                ></div>
                <span>{venue}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Spectacles
