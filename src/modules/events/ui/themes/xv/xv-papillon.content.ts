import type { InvitationContent } from '../../../domain/invitation-content'

/**
 * El contenido de muestra de «Papillon», copiado de la maqueta V3. En el itinerario,
 * `imageId` es la pieza rosa: `copa`, `cena`, `baile`, `torta`, `mascara` o `carruaje`.
 */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: { eyebrow: '· MIS QUINCE ·', nameA: 'Emilia', serial: '2026' },
  quote: { text: 'Como mariposas que danzan al viento, hoy abro mis alas hacia un nuevo comienzo.' },
  hosts: {
    label: 'AGRADECIDA POR EL AMOR Y CUIDADO DE MIS PADRES',
    names: ['Marcela Ríos', 'Fernando Ortega', 'Rosa Delgado', 'Adrián Solís'],
    roles: { mother: 'Marcela Ríos', father: 'Fernando Ortega', godparents: ['Rosa Delgado', 'Adrián Solís'] },
  },
  schedule: { startsAt: '2026-09-12T19:00:00' },
  reception: { label: 'Recepción Social', place: 'Jardín Botánico Le Blanc', time: '18:00' },
  map: { label: 'RECEPCIÓN', coords: '19.30°N · 99.14°W' },
  itinerary: [
    { time: '18:00', label: 'RECEPCIÓN', imageId: 'copa' },
    { time: '21:00', label: 'CENA', imageId: 'cena' },
    { time: '23:00', label: 'BAILE SORPRESA', imageId: 'baile' },
    { time: '00:00', label: 'TORTA', imageId: 'torta' },
    { time: '01:00', label: 'HORA LOCA', imageId: 'mascara' },
    { time: '02:00', label: 'CIERRE', imageId: 'carruaje' },
  ],
  music: { track: 'River Flows in You', artist: 'Yiruma · Instrumental' },
  dressCode: { title: 'Código de Vestimenta', note: 'FORMAL — ELEGANTE' },
  notes: [
    {
      title: 'Lluvia de Sobres',
      text: 'Tu presencia es el mejor regalo, pero si deseas tener un detalle conmigo, será muy bien recibido.',
    },
  ],
  closing: { text: 'Te espero, para celebrar conmigo esta noche de mariposas y sueños.', signature: 'Emilia' },
}
