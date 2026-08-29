import type { InvitationContent } from '../../../domain/invitation-content'

/** El contenido de muestra de «Bosque Encantado», copiado de la maqueta. */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: {
    eyebrow: '· MIS QUINCE ·',
    nameA: 'Luciana',
    monogram: 'XV',
    serial: '2026',
  },
  quote: { text: 'Que la vida te devuelva toda la luz que tú das. Brilla, para eso naciste' },
  hosts: {
    label: 'Agradecida por el amor y cuidado de mis padres',
    names: ['Juan Julio Pereira', 'Linzi Torrico'],
  },
  schedule: { startsAt: '2026-09-12T19:00:00' },
  reception: {
    label: 'Recepción Social',
    place: 'Salón de Eventos Elianne',
    address: 'Km 8, Carretera al Bosque',
    time: '18:00',
  },
  map: { label: 'HACIENDA LAS ESTRELLAS', coords: '19.32°N · 99.18°W' },
  itinerary: [
    { time: '18:00', label: 'Recepción', imageId: 'recepcion' },
    { time: '20:30', label: 'Acto Central', imageId: 'corona' },
    { time: '21:30', label: 'Fiesta', imageId: 'fiesta' },
    { time: '02:00', label: 'Despedida', imageId: 'despedida' },
  ],
  music: { track: 'Tiempo de Vals', artist: 'Chayanne · vals oficial' },
  dressCode: {
    title: 'Código de Vestimenta',
    note: 'FORMAL — DE GALA',
    detail: 'El dorado y el verde quedan reservados para la quinceañera',
  },
  notes: [
    { title: 'Lluvia de Sobres', text: 'Habrá un buzón esperando para tus deseos.' },
    { title: 'Solo Adultos', text: 'Evento para adultos y adolescentes.' },
  ],
  gallery: [{ label: 'Retrato' }],
  closing: {
    text: 'Gracias por acompañarme, te espero para celebrar.',
    signature: 'Luciana',
  },
}
