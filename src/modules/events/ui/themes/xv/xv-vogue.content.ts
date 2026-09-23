import type { InvitationContent } from '../../../domain/invitation-content'

/** El contenido de muestra de «Rosa Pastel», copiado de su maqueta (`xv-premium.jsx`, `QuinceVogue`). */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: { nameA: 'Isabela' },
  schedule: { startsAt: '2026-09-19T20:00:00' },
  reception: { place: 'Salón Rosa Vogue' },
  map: { coords: '19.40°N · 99.15°W' },
  itinerary: [
    { time: '19:00', label: 'Misa de acción de gracias', note: 'Catedral Metropolitana' },
    { time: '20:00', label: 'Cóctel de bienvenida' },
    { time: '21:00', label: 'Entrada & vals' },
    { time: '22:00', label: 'Cena de gala' },
    { time: '23:30', label: 'Fiesta · DJ set' },
  ],
  gallery: [{ label: 'editorial 1' }, { label: 'editorial 2' }, { label: 'editorial 3' }, { label: 'backstage' }],
  music: { track: 'Vogue Nights', artist: 'Playlist oficial' },
}
