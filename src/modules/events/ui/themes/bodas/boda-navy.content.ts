import type { InvitationContent } from '../../../domain/invitation-content'

/**
 * El contenido de muestra de «Noche Estrellada», copiado de su maqueta
 * (`wedding-variants-7.jsx`): la boda de Maya & Anderson.
 */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: { eyebrow: 'Nuestra Boda', nameA: 'Maya', nameB: 'Anderson', serial: '· NOS CASAMOS · 20.09.2026 ·' },
  quote: { text: '"Te ví y supe\nque era todo\nlo que iba a querer."' },
  schedule: { startsAt: '2026-09-20T18:00:00' },
  hosts: {
    label: 'Con la bendición de Dios y de nuestros padres',
    names: [
      'Carmen Robles de Vargas',
      'Ricardo Vargas Núñez',
      'Lucía Mendoza de Terán',
      'Fernando Terán Castillo',
      'Elena Sandoval de Quiroga',
      'Andrés Quiroga Beltrán',
    ],
    roles: {
      brideMother: 'Carmen Robles de Vargas',
      brideFather: 'Ricardo Vargas Núñez',
      groomMother: 'Lucía Mendoza de Terán',
      groomFather: 'Fernando Terán Castillo',
      godparents: ['Elena Sandoval de Quiroga', 'Andrés Quiroga Beltrán'],
    },
  },
  ceremony: { label: 'Ceremonia Religiosa', place: 'Parroquia San Rafael', time: '13:00' },
  reception: { label: 'Recepción Social', place: 'Salón Los Cedros', time: '15:00' },
  map: { label: 'SALÓN LOS CEDROS', coords: '17.39°S · 66.15°O' },
  itinerary: [
    { time: '13:45', label: 'Ceremonia Religiosa' },
    { time: '16:00', label: 'Recepción Social' },
    { time: '17:00', label: 'Vals de los Novios' },
    { time: '19:00', label: 'Una Deliciosa Cena' },
    { time: '21:00', label: 'Partimos la Torta' },
    { time: '00:00', label: 'Felices para Siempre' },
  ],
  dressCode: {
    title: 'Gala elegante',
    note: 'Formal · paleta tierra · tejidos naturales · sin blanco · sin nude · sin neón.',
    colors: ['#1a1a1a', '#c5963a', '#c8b8a0', '#7a8c64', '#f1ede4'],
  },
  notes: [
    {
      title: 'Nuestra historia',
      text: 'Fue en una librería de viejo, una tarde de septiembre. Maya buscaba a Borges. Anderson tropezó con su pila de libros. Se cayeron tres tomos y un cuaderno de notas con dibujos. Lo demás, como suele decirse, es historia. Siete años más tarde, Maya escribe poemas. Anderson sigue dibujando. Y ambos firman la suya, en septiembre, igual que la primera vez.',
    },
    {
      title: 'Celebración solo para adultos',
      text: 'Los niños son alegría, pero esta noche queremos que ustedes también descansen.',
    },
    {
      title: 'Mesa de regalos',
      text: 'Su presencia es nuestro mejor regalo. Si además desean tener un detalle con nosotros, les dejamos algunas ideas.',
    },
  ],
  music: { track: 'Nuestra canción', artist: 'Maya & Anderson' },
  closing: { text: 'Te esperamos.', signature: 'Maya & Anderson' },
}
