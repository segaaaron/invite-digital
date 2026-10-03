import type { InvitationContent } from '../../../domain/invitation-content'

/** El contenido de muestra de «Gala Real», copiado de la maqueta. */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: {
    eyebrow: '· MIS QUINCE ·',
    nameA: 'Valeria',
    monogram: 'XV',
    serial: '2026',
  },
  quote: { text: 'Que nunca dejes de soñar, y que cada sueño te encuentre preparada.' },
  hosts: {
    label: 'Junto a mis padres',
    names: ['Juan Julio Pereira', 'Linzi Torrico'],
  },
  schedule: { startsAt: '2026-09-12T18:00:00' },
  reception: {
    label: 'Recepción Social',
    place: 'Salón de Eventos Elianne',
    time: '18:00',
  },
  map: { label: 'SALÓN ELIANNE', coords: '17.39°S · 66.16°W' },
  itinerary: [
    { time: '18:00', label: 'Recepción' },
    { time: '21:00', label: 'Acto Principal' },
    { time: '23:00', label: 'Baile Sorpresa' },
    { time: '00:00', label: 'Torta' },
    { time: '02:00', label: 'Cierre' },
  ],
  music: { track: 'Tiempo de Vals', artist: 'Chayanne · vals oficial' },
  dressCode: {
    title: 'Código de Vestimenta',
    note: 'FORMAL — DE GALA',
    detail: 'El dorado y el negro quedan reservados para la quinceañera',
  },
  gallery: [{ label: 'Retrato' }],
  closing: {
    text: 'Te espero para celebrar juntos esta noche real.',
    signature: 'Valeria',
  },
}
