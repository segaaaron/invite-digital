import type { InvitationContent } from '../../../domain/invitation-content'

/**
 * El contenido de muestra de «Jardín de Serenidad», copiado de su maqueta
 * (`wedding-variants-5.jsx`): la boda de Sofía & Daniel.
 */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: { eyebrow: 'ISSUE · 09 / 2026', nameA: 'Sofía', nameB: 'Daniel' },
  quote: { text: '"Te ví y supe\nque era todo\nlo que iba a querer."' },
  schedule: { startsAt: '2026-09-20T13:00:00' },
  hosts: {
    label: 'Con la bendición de Dios y de nuestros padres',
    names: [
      'Lucía Zambrana de Herrera',
      'Fernando Herrera Montaño',
      'Mariana Peñaranda de Arandia',
      'Gustavo Arandia Céspedes',
      'Elena Quiroga de Vargas',
      'Andrés Vargas Terceros',
    ],
    roles: {
      brideMother: 'Lucía Zambrana de Herrera',
      brideFather: 'Fernando Herrera Montaño',
      groomMother: 'Mariana Peñaranda de Arandia',
      groomFather: 'Gustavo Arandia Céspedes',
      godparents: ['Elena Quiroga de Vargas', 'Andrés Vargas Terceros'],
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
    note: 'Formal · paleta fría · sin blanco · sin nude · sin neón.',
    colors: ['#1a1a1a', '#1a2b4a', '#c8b8a0', '#c0c4cc', '#f1ede4'],
  },
  notes: [
    {
      title: 'Nuestra historia',
      text: 'Fue en una librería de viejo, una tarde de septiembre. Sofía buscaba a Borges. Daniel tropezó con su pila de libros. Se cayeron tres tomos y un cuaderno de notas con dibujos. Lo demás, como suele decirse, es historia. Siete años más tarde, Sofía escribe poemas. Daniel sigue dibujando. Y ambos firman la suya, en septiembre, igual que la primera vez.',
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
  music: { track: 'Nuestra canción', artist: 'Sofía & Daniel' },
  closing: { text: 'Te esperamos.', signature: 'Sofía & Daniel' },
}
