import type { InvitationContent } from '../../../domain/invitation-content'

/**
 * El contenido de muestra de «Princesa Real», copiado de su maqueta (`xv-variants.jsx`,
 * `QuincePrincess`). Los «Padrinos del Vals» son los avisos: cada uno, su papel y quién.
 */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: { nameA: 'Valentina' },
  quote: { text: '"Hoy dejo de ser niña\npero no dejaré de soñar."' },
  schedule: { startsAt: '2026-09-12T19:00:00' },
  ceremony: { label: 'Ceremonia Religiosa', place: 'Parroquia del Carmen', address: 'Av. Madero 18, Centro', time: '17:00' },
  reception: { label: 'Vals & Recepción', place: 'Hacienda Princesa', address: 'Km 6 Camino al Lago', time: '19:00' },
  map: { coords: '19.32°N · 99.18°W' },
  gallery: [{ label: 'bebé' }, { label: '5 años' }, { label: '10 años' }, { label: 'hoy' }],
  notes: [
    { title: 'Vals', text: 'Roberto & Lucía' },
    { title: 'Vestido', text: 'Esperanza García' },
    { title: 'Pastel', text: 'Marco & Diana' },
    { title: 'Ramo', text: 'Carmen Ríos' },
  ],
  music: { track: 'Tiempo de Vals', artist: 'Chayanne · vals oficial' },
  dressCode: { title: 'Formal · pastel' },
}
