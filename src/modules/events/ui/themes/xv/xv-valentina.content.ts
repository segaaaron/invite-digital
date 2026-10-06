import type { InvitationContent } from '../../../domain/invitation-content'

/** El contenido de muestra de «Mascarada», copiado de la maqueta. */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: {
    eyebrow: '· MIS QUINCE ·',
    nameA: 'Valentina',
    monogram: 'XV',
    serial: '2026',
  },
  quote: { text: 'Detrás de cada máscara hay un sueño. El mío se hace realidad la noche de mis quince años.' },
  hosts: {
    label: 'Agradecida por el amor y cuidado de mis padres',
    names: ['Eduardo Quiroga Lema', 'Patricia Antezana de Quiroga'],
  },
  schedule: { startsAt: '2026-09-12T19:00:00' },
  reception: {
    label: 'Recepción Social',
    place: 'El Portal Centro de Convenciones',
    address: 'Av. Ricardo Jaimes Freyre 1929, Norte Parque Lincoln, Cochabamba',
    time: '19:00',
  },
  map: { label: 'EL PORTAL CENTRO DE CONVENCIONES', coords: '17.37°S · 66.16°W' },
  itinerary: [
    { time: '19:00', label: 'Recepción', imageId: 'recepcion' },
    { time: '20:30', label: 'Acto Central', imageId: 'corona' },
    { time: '21:30', label: 'Fiesta', imageId: 'fiesta' },
    { time: '02:00', label: 'Despedida', imageId: 'despedida' },
  ],
  music: { track: 'Masquerade', artist: 'Andrew Lloyd Webber' },
  dressCode: {
    title: 'Código de Vestimenta',
    note: 'FORMAL — DE GALA',
    detail: 'El dorado y el morado quedan reservados para la quinceañera',
  },
  notes: [
    // Dos párrafos: la intro de la tarjeta de regalos y la nota corta bajo el sobre.
    { title: 'Lluvia de Sobres', text: 'Que estés ahí, celebrando conmigo, ya lo es todo. Si tu cariño quiere expresarse de otra forma, aquí tienes una opción.\n\nEl día del evento habrá un buzón esperando tus sobres.' },
    {
      title: 'Una noche sin niños',
      text: 'Sabemos lo especiales que son tus pequeños, y por eso queremos que esta noche la disfrutes sin preocupaciones. La celebración es para invitados a partir de los 12 años.',
    },
  ],
  gallery: [{ label: 'Retrato' }],
  closing: {
    // V4: solo la bendición del final.
    text: 'Al caer las máscaras, quedan los recuerdos. Gracias por hacer mágica esta noche.',
    signature: 'Valentina',
  },
}
