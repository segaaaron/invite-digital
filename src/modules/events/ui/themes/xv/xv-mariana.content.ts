import type { InvitationContent } from '../../../domain/invitation-content'

/** El contenido de muestra de «Encanto Musical», copiado de la maqueta. */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: {
    eyebrow: '· MIS QUINCE ·',
    nameA: 'Mariana',
    monogram: 'XV',
    serial: '2026',
  },
  quote: { text: 'Que nunca dejes de soñar, y que cada sueño te encuentre preparada.' },
  hosts: {
    label: 'Agradecida por el amor y cuidado de mis padres',
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
  // Las cinco filas de su maqueta (`invites-1.jsx:2325-2331`). Faltaba la torta, y la
  // última se llamaba «Despedida» en vez de «Cierre».
  itinerary: [
    { time: '18:00', label: 'Recepción', imageId: 'recepcion' },
    { time: '21:00', label: 'Cena', imageId: 'cena' },
    { time: '23:00', label: 'Baile Sorpresa', imageId: 'baile' },
    { time: '00:00', label: 'Torta', imageId: 'torta' },
    { time: '02:00', label: 'Cierre', imageId: 'cierre' },
  ],
  music: { track: 'Tiempo de Vals', artist: 'Chayanne · vals oficial' },
  dressCode: {
    title: 'Código de Vestimenta',
    note: 'FORMAL — DE GALA',
    detail: 'El dorado y el negro quedan reservados para la quinceañera',
  },
  gallery: [{ label: 'Retrato' }],
  closing: {
    text: 'Te espero, para celebrar conmigo esta noche iluminada.',
    signature: 'Mariana',
  },
}
