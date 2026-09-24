import type { InvitationContent } from '../../../domain/invitation-content'

/**
 * El contenido de muestra de «Palacio Griego», copiado de la maqueta V3. En el itinerario,
 * `imageId` es la pieza dorada: `copa`, `cena`, `baile`, `torta` o `carroza`.
 */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: {
    eyebrow: '· MIS QUINCE ·',
    nameA: 'Isabelle',
    monogram: 'XV',
    serial: '2026',
  },
  quote: { text: 'Como una diosa entre columnas,\nhoy florece mi historia\nbajo cielos de mármol y oro.' },
  hosts: {
    label: 'Agradecida por el amor y cuidado de mis padres',
    names: ['Juan Julio Pereira', 'Linzi Torrico'],
  },
  schedule: { startsAt: '2026-09-12T19:00:00' },
  reception: { label: 'Recepción Social', place: 'Salón de Eventos Elianne', time: '18:00' },
  map: { label: 'SALÓN ELIANNE', coords: '19.32°N · 99.18°W' },
  itinerary: [
    { time: '18:00', label: 'Recepción', imageId: 'copa' },
    { time: '21:00', label: 'Cena', imageId: 'cena' },
    { time: '23:00', label: 'Baile Sorpresa', imageId: 'baile' },
    { time: '00:00', label: 'Torta', imageId: 'torta' },
    { time: '02:00', label: 'Cierre', imageId: 'carroza' },
  ],
  music: { track: 'Canon in D', artist: 'Instrumental' },
  dressCode: {
    title: 'Código de Vestimenta',
    note: 'FORMAL — DE GALA',
    detail: 'El dorado queda reservado para la quinceañera',
  },
  closing: {
    text: 'Te espero, para celebrar conmigo esta noche entre columnas y estrellas.',
    signature: 'Isabelle',
  },
}
