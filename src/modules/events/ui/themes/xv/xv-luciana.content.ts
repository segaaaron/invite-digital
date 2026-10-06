import type { InvitationContent } from '../../../domain/invitation-content'

/** El contenido de muestra de «Bosque Encantado», copiado de la maqueta. */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: {
    eyebrow: '· MIS QUINCE ·',
    nameA: 'Luciana',
    monogram: 'XV',
    serial: '2026',
  },
  quote: { text: 'En un bosque\ndonde los sueños florecen,\nmis quince años están listos\npara despertar.' },
  hosts: {
    label: 'Agradecida por el amor y cuidado de mis padres',
    names: ['Sergio Camacho Flores', 'Daniela Ortiz de Camacho'],
  },
  schedule: { startsAt: '2026-09-12T19:00:00' },
  reception: {
    label: 'Recepción Social',
    place: "Salón de Eventos D' La Rossa",
    address: 'Av. Juan de La Rosa 833, Cochabamba · JRFJ+36J',
    time: '19:00',
  },
  map: { label: "SALÓN D' LA ROSSA", coords: '17.38°S · 66.17°W' },
  itinerary: [
    { time: '19:00', label: 'Recepción' },
    { time: '20:30', label: 'Acto Central' },
    { time: '21:30', label: 'Fiesta' },
    { time: '02:00', label: 'Despedida' },
  ],
  music: { track: 'Once Upon a Dream', artist: 'Lana Del Rey' },
  dressCode: {
    title: 'Código de Vestimenta',
    note: 'FORMAL — DE GALA',
    detail: 'El dorado y el verde quedan reservados para la quinceañera',
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
    text: 'Que la magia de esta noche florezca siempre en tu corazón. Gracias por acompañarme.',
    signature: 'Luciana',
  },
}
