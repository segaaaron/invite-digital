import type { InvitationContent } from '../../../domain/invitation-content'

/** El contenido de muestra de «Noche Estrellada», copiado de la maqueta. */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: {
    eyebrow: '· MIS QUINCE ·',
    nameA: 'Alicia',
    monogram: 'XV',
    serial: '2026',
  },
  quote: { text: 'Que nunca dejes de soñar,\ny que cada sueño te encuentre\npreparada.' },
  hosts: {
    label: 'Agradecida por el amor de mis padres',
    names: ['Juan Julio Pereira', 'Linzi Torrico'],
  },
  schedule: { startsAt: '2026-09-12T19:00:00' },
  reception: {
    label: 'Recepción Social',
    place: 'El Portal Centro de Convenciones',
    time: '19:00',
  },
  map: { label: 'EL PORTAL CENTRO DE CONVENCIONES', coords: '17.37°S · 66.16°W' },
  // Las cinco filas de su maqueta (`invites-1.jsx:1857-1863`). Tenía las cuatro de «Bajo
  // el Mar» —«Acto Central» a las 20:30, «Fiesta» a las 21:30, «Despedida»— que no son de
  // este diseño: aquí la noche va recepción, acto, baile, torta y cierre, y la última
  // fila, la de la torta, no existía.
  itinerary: [
    { time: '19:00', label: 'Recepción', imageId: 'recepcion' },
    { time: '21:00', label: 'Acto Principal', imageId: 'corona' },
    { time: '23:00', label: 'Baile Sorpresa', imageId: 'baile' },
    { time: '00:00', label: 'Torta', imageId: 'torta' },
    { time: '02:00', label: 'Cierre', imageId: 'cierre' },
  ],
  music: { track: 'Clair de Lune', artist: 'Claude Debussy' },
  dressCode: {
    title: 'Código de Vestimenta',
    note: 'FORMAL — DE GALA',
    detail: 'El azul y el dorado quedan reservados para la quinceañera',
  },
  // V4: su aviso de «solo adultos», en tarjeta propia.
  notes: [
    {
      title: 'Una noche sin niños',
      text: 'Sabemos lo especiales que son tus pequeños, y por eso queremos que esta noche la disfrutes sin preocupaciones. La celebración es para invitados a partir de los 12 años.',
    },
  ],
  gallery: [{ label: 'Retrato' }],
  closing: {
    text: 'Bajo la luz de la luna y las estrellas, gracias por acompañarme en esta noche tan especial.',
    signature: 'Alicia',
  },
}
