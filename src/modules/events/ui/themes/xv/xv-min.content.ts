import type { InvitationContent } from '../../../domain/invitation-content'

/**
 * El contenido de muestra de «Editorial», copiado de su maqueta (`xv-variants.jsx`,
 * `QuinceMinimal`). La tarjeta negra de la «mesa digital» es el aviso.
 */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: { nameA: 'Sofía' },
  quote: { text: '"Cumplir quince es elegir qué tipo de mujer quiero ser. Hoy elijo ser auténtica."' },
  schedule: { startsAt: '2026-11-21T18:00:00' },
  reception: { place: 'Hacienda Lavanda', address: 'Km 14 Carretera al Lago · Edo. de México' },
  map: { coords: '19.38°N · 99.22°W' },
  itinerary: [
    { time: '17:00', label: 'Ceremonia religiosa', note: 'Templo Sta. Bárbara' },
    { time: '18:00', label: 'Cóctel de llegada', note: 'Foyer del salón' },
    { time: '19:30', label: 'Cena de gala', note: 'Salón Norte' },
    { time: '21:00', label: 'Vals & primer baile' },
    { time: '22:00', label: 'Tarde de música abierta', note: 'DJ Loma' },
    { time: '02:00', label: 'Cierre' },
  ],
  dressCode: { title: 'Formal · paleta neutra.', colors: ['#0a0a0a', '#7c5cff', '#a89880', '#d8cdb8', '#f4f4f1'] },
  notes: [{ title: 'Para su próximo viaje.', text: 'Escanea para aportar.' }],
}
