import type { InvitationContent } from '../../../domain/invitation-content'

/** El contenido de muestra de «Art Déco», copiado de su maqueta (`xv-premium.jsx`, `QuinceDeco`). */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: { nameA: 'Alessandra' },
  schedule: { startsAt: '2026-11-07T19:00:00' },
  reception: { place: 'Gran Salón Imperial' },
  map: { coords: '19.29°N · 99.10°W' },
  itinerary: [
    { time: '19:00', label: 'Recepción · alfombra dorada', note: 'Gran Salón Imperial' },
    { time: '20:00', label: 'Vals de honor' },
    { time: '20:45', label: 'Cena de gala' },
    { time: '22:00', label: 'Show en vivo' },
    { time: '23:30', label: 'Baile hasta el amanecer' },
  ],
  gallery: [{ label: 'glam 1' }, { label: 'glam 2' }, { label: 'glam 3' }, { label: 'hoy' }],
  music: { track: 'Golden Hour', artist: 'Orquesta en vivo' },
}
