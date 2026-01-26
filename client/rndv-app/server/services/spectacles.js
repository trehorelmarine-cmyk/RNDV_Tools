// Service Spectacles - Données de la saison 2025-2026 Comédie-Française
// Source : https://www.comedie-francaise.fr/fr/saison
// Période : janvier à juillet 2026

const SHOWS = [
  {
    id: 1,
    title: 'Les Femmes savantes',
    venue: 'Théâtre du Rond-Point',
    startDate: '2026-01-14',
    endDate: '2026-03-01',
    firstShowTime: '20h30',
    slug: 'les-femmes-savantes-25-26'
  },
  {
    id: 2,
    title: 'Six personnages en quête d\'auteur',
    venue: 'Vieux-Colombier',
    startDate: '2026-01-20',
    endDate: '2026-03-01',
    firstShowTime: '19h00',
    slug: 'six-personnages-en-quete-dauteur-25-26'
  },
  {
    id: 3,
    title: 'Hamlet',
    venue: 'Odéon',
    startDate: '2026-01-21',
    endDate: '2026-03-14',
    firstShowTime: '20h00',
    slug: 'hamlet-25-26'
  },
  {
    id: 4,
    title: 'Bestioles',
    venue: 'Studio-Théâtre',
    startDate: '2026-01-22',
    endDate: '2026-03-01',
    firstShowTime: '18h30',
    slug: 'bestioles'
  },
  {
    id: 5,
    title: 'Contre',
    venue: 'Petit Saint-Martin',
    startDate: '2026-01-29',
    endDate: '2026-03-08',
    firstShowTime: '19h00',
    slug: 'contre-25-26'
  },
  {
    id: 6,
    title: 'Le Bourgeois gentilhomme',
    venue: 'Porte Saint-Martin',
    startDate: '2026-01-31',
    endDate: '2026-03-08',
    firstShowTime: '20h30',
    slug: 'le-bourgeois-gentilhomme-25-26'
  },
  {
    id: 7,
    title: 'Déshonorée',
    venue: 'Studio-Théâtre',
    startDate: '2026-02-04',
    endDate: '2026-02-22',
    firstShowTime: '20h30',
    slug: 'deshonoree-un-crime-d-honneur-en-calabre'
  },
  {
    id: 8,
    title: 'La Ballade de Souchon',
    venue: 'Théâtre Montparnasse',
    startDate: '2026-03-19',
    endDate: '2026-04-05',
    firstShowTime: null,
    slug: 'la-ballade-de-souchon'
  },
  {
    id: 9,
    title: 'Art majeur',
    venue: 'Studio-Théâtre',
    startDate: '2026-03-19',
    endDate: '2026-05-03',
    firstShowTime: '18h30',
    slug: 'art-majeur-25-26'
  },
  {
    id: 10,
    title: 'Les héros ne dorment jamais',
    venue: 'Petit Saint-Martin',
    startDate: '2026-03-20',
    endDate: '2026-05-10',
    firstShowTime: '19h00',
    slug: 'les-heros-ne-dorment-jamais'
  },
  {
    id: 11,
    title: 'La Puce à l\'oreille',
    venue: 'Nanterre-Amandiers',
    startDate: '2026-03-25',
    endDate: '2026-05-10',
    firstShowTime: '20h00',
    slug: 'la-puce-a-loreille-25-26'
  },
  {
    id: 12,
    title: 'L\'Ordre du jour',
    venue: 'Vieux-Colombier',
    startDate: '2026-03-25',
    endDate: '2026-05-03',
    firstShowTime: '20h30',
    slug: 'lordre-du-jour'
  },
  {
    id: 13,
    title: 'Le Cid',
    venue: 'Porte Saint-Martin',
    startDate: '2026-03-26',
    endDate: '2026-05-17',
    firstShowTime: '20h30',
    slug: 'le-cid-25-26'
  },
  {
    id: 14,
    title: 'Hécube, pas Hécube',
    venue: '13e Art',
    startDate: '2026-03-30',
    endDate: '2026-04-17',
    firstShowTime: '20h30',
    slug: 'hecube-pas-hecube-25-26'
  },
  {
    id: 15,
    title: 'Lumières, lumières, lumières',
    venue: 'Studio-Théâtre',
    startDate: '2026-05-13',
    endDate: '2026-06-28',
    firstShowTime: '18h30',
    slug: 'lumieres-lumieres-lumieres'
  },
  {
    id: 16,
    title: 'Le Tartuffe ou l\'hypocrite',
    venue: 'La Villette',
    startDate: '2026-05-21',
    endDate: '2026-07-11',
    firstShowTime: '19h00',
    slug: 'le-tartuffe-ou-lhypocrite-25-26'
  },
  {
    id: 17,
    title: 'Séisme',
    venue: 'Petit Saint-Martin',
    startDate: '2026-05-21',
    endDate: '2026-07-05',
    firstShowTime: '19h00',
    slug: 'seisme'
  },
  {
    id: 18,
    title: 'Penthésilée',
    venue: 'Vieux-Colombier',
    startDate: '2026-05-27',
    endDate: '2026-07-12',
    firstShowTime: '20h30',
    slug: 'penthesilee-25-26'
  },
  {
    id: 19,
    title: 'Le Malade imaginaire',
    venue: 'Porte Saint-Martin',
    startDate: '2026-05-27',
    endDate: '2026-07-12',
    firstShowTime: '20h30',
    slug: 'le-malade-imaginaire-25-26'
  },
  {
    id: 20,
    title: 'La Vie parisienne',
    venue: 'Théâtre du Châtelet',
    startDate: '2026-06-12',
    endDate: '2026-07-11',
    firstShowTime: null,
    slug: 'la-vie-parisienne-25-26'
  }
]

// Couleurs par salle
const VENUE_COLORS = {
  'Théâtre du Rond-Point': '#F59E0B',
  'Vieux-Colombier': '#3B82F6',
  'Odéon': '#8B5CF6',
  'Studio-Théâtre': '#10B981',
  'Petit Saint-Martin': '#EF4444',
  'Porte Saint-Martin': '#F97316',
  'Théâtre Montparnasse': '#EC4899',
  'Nanterre-Amandiers': '#06B6D4',
  '13e Art': '#84CC16',
  'La Villette': '#6366F1',
  'Théâtre du Châtelet': '#D946EF'
}

const PLANNING_START = new Date(2026, 0, 1) // 1er janvier 2026
const PLANNING_END = new Date(2026, 6, 31)  // 31 juillet 2026
const MONTH_WIDTH = 150

function dateToPosition(dateStr) {
  const date = new Date(dateStr)
  const monthsDiff = (date.getFullYear() - 2026) * 12 + date.getMonth()
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const dayProgress = (date.getDate() - 1) / daysInMonth
  return Math.max(0, Math.round((monthsDiff + dayProgress) * MONTH_WIDTH))
}

function dateToEndPosition(dateStr) {
  const date = new Date(dateStr)
  const monthsDiff = (date.getFullYear() - 2026) * 12 + date.getMonth()
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const dayProgress = date.getDate() / daysInMonth
  return Math.max(0, Math.round((monthsDiff + dayProgress) * MONTH_WIDTH))
}

function formatDateFr(dateStr) {
  const date = new Date(dateStr)
  const day = date.getDate()
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet']
  const monthName = months[date.getMonth()]
  return `${day === 1 ? '1er' : day} ${monthName}`
}

export function getSpectacles() {
  const shows = SHOWS.map(show => {
    const left = dateToPosition(show.startDate)
    const right = dateToEndPosition(show.endDate)

    return {
      ...show,
      left,
      width: Math.max(40, right - left),
      color: VENUE_COLORS[show.venue] || '#6B7280',
      startDateFormatted: formatDateFr(show.startDate),
      endDateFormatted: formatDateFr(show.endDate)
    }
  })

  // Position "aujourd'hui"
  const today = new Date()
  let todayPosition = null
  if (today >= PLANNING_START && today <= PLANNING_END) {
    const monthsDiff = (today.getFullYear() - 2026) * 12 + today.getMonth()
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    const dayProgress = (today.getDate() - 1) / daysInMonth
    todayPosition = Math.round((monthsDiff + dayProgress) * MONTH_WIDTH)
  }

  // Mois du planning
  const months = [
    { name: 'Janvier', year: 2026 },
    { name: 'Février', year: 2026 },
    { name: 'Mars', year: 2026 },
    { name: 'Avril', year: 2026 },
    { name: 'Mai', year: 2026 },
    { name: 'Juin', year: 2026 },
    { name: 'Juillet', year: 2026 }
  ]

  return {
    shows,
    months,
    todayPosition,
    monthWidth: MONTH_WIDTH,
    venueColors: VENUE_COLORS
  }
}
