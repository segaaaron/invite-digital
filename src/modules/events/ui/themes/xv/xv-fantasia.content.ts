import type { InvitationContent } from '../../../domain/invitation-content'

/** El contenido de muestra de «Noche Estrellada», copiado de la maqueta. */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: {
    eyebrow: '· MIS QUINCE ·',
    nameA: 'Alicia',
    monogram: 'XV',
    serial: '2026',
  },
  quote: { text: 'Que nunca dejes de soñar, y que cada sueño te encuentre preparada.' },
  hosts: {
    label: 'Junto a mis padres',
    names: ['Juan Julio Pereira', 'Linzi Torrico'],
  },
  schedule: { startsAt: '2026-09-12T19:00:00' },
  reception: {
    label: 'Recepción Social',
    place: 'Salón de Eventos Elianne',
    address: 'Km 8, Carretera al Cielo',
    time: '18:00',
  },
  map: { label: 'SALÓN ELIANNE', coords: '19.32°N · 99.18°W' },
  // Las cinco filas de su maqueta (`invites-1.jsx:1857-1863`). Tenía las cuatro de «Bajo
  // el Mar» —«Acto Central» a las 20:30, «Fiesta» a las 21:30, «Despedida»— que no son de
  // este diseño: aquí la noche va recepción, acto, baile, torta y cierre, y la última
  // fila, la de la torta, no existía.
  itinerary: [
    { time: '18:00', label: 'Recepción', imageId: 'recepcion' },
    { time: '21:00', label: 'Acto Principal', imageId: 'corona' },
    { time: '23:00', label: 'Baile Sorpresa', imageId: 'baile' },
    { time: '00:00', label: 'Torta', imageId: 'torta' },
    { time: '02:00', label: 'Cierre', imageId: 'cierre' },
  ],
  music: { track: 'Tiempo de Vals', artist: 'Chayanne · vals oficial' },
  dressCode: {
    title: 'Código de Vestimenta',
    note: 'FORMAL — DE GALA',
    detail: 'El azul y el dorado quedan reservados para la quinceañera',
  },
  gallery: [{ label: 'Retrato' }],
  closing: {
    text: 'Sígueme al país de las maravillas. Te espero.',
    signature: 'Alicia',
  },
}
