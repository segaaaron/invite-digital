import type { InvitationContent } from '../../../domain/invitation-content'

/** El contenido de muestra de «Sunset», copiado de su maqueta (`xv-premium.jsx`, `QuinceTropical`). */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: { eyebrow: 'Playa del atardecer', nameA: 'Ximena' },
  schedule: { startsAt: '2026-12-05T18:00:00' },
  reception: { place: 'Terraza Poniente' },
  map: { coords: '20.63°N · 105.23°W' },
  itinerary: [
    { time: '18:00', label: 'Ceremonia frente al mar', note: 'Terraza Poniente' },
    { time: '19:00', label: 'Cóctel · pies en la arena' },
    { time: '20:00', label: 'Vals & fuegos artificiales' },
    { time: '21:00', label: 'Cena tropical' },
    { time: '22:30', label: 'Fiesta bajo las estrellas' },
  ],
  gallery: [{ label: 'playa' }, { label: 'amigas' }, { label: 'familia' }, { label: 'hoy' }],
  music: { track: 'Sunset Groove', artist: 'Beach house mix' },
}
