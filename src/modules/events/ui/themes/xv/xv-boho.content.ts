import type { InvitationContent } from '../../../domain/invitation-content'

/** El contenido de muestra de «Bohemia», copiado de su maqueta (`xv-premium.jsx`, `QuinceBoho`). */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: { nameA: 'Renata' },
  quote: { text: '"Como las flores del campo,\nhoy florezco a mi manera."' },
  schedule: { startsAt: '2026-10-24T18:30:00' },
  reception: { place: 'Jardín Las Lomas' },
  map: { coords: '19.05°N · 98.20°W' },
  itinerary: [
    { time: '18:30', label: 'Ceremonia religiosa', note: 'Ermita del Bosque' },
    { time: '20:00', label: 'Recepción al aire libre', note: 'Jardín Las Lomas' },
    { time: '20:45', label: 'Vals sorpresa' },
    { time: '21:30', label: 'Cena & brindis' },
    { time: '23:00', label: 'Baile abierto' },
  ],
  gallery: [{ label: 'raíces' }, { label: 'hoy' }, { label: 'familia' }],
  music: { track: 'Bohemian Waltz', artist: 'Acústico en vivo' },
}
