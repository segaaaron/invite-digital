import type { InvitationContent } from '../../../domain/invitation-content'

/**
 * El contenido de muestra de «Sobre Lacrado», copiado de su maqueta
 * (`boda-sobre-lacrado.jsx`, `WeddingSobreLacrado`): la boda de Camila & Sebastián.
 */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: { eyebrow: 'NOS CASAMOS', nameA: 'Camila', nameB: 'Sebastián' },
  quote: { text: '"y vivieron felices\npara siempre"' },
  schedule: { startsAt: '2026-11-14T16:00:00' },
  hosts: {
    label: 'Con la bendición de Dios y de nuestros padres',
    // `names` lo compone el parser para los diseños que no distinguen papeles; este sí los
    // distingue —padres de la novia, del novio y padrinos—, y por eso lleva `roles`.
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
  ceremony: { label: 'Ceremonia Religiosa', place: 'Parroquia San Rafael', time: '16:00' },
  reception: { label: 'Recepción Social', place: 'Salón Los Cedros', time: '18:00' },
  map: { label: 'SALÓN LOS CEDROS', coords: '17.39°S · 66.15°O' },
  itinerary: [
    { time: '16:00 h', label: 'Ceremonia Religiosa' },
    { time: '18:00 h', label: 'Recepción Social' },
    { time: '18:30 h', label: 'Brindis' },
    { time: '20:00 h', label: 'Cena' },
    { time: '22:00 h', label: 'Lanzamiento de bouquet' },
    { time: '22:30 h', label: 'Comienza la fiesta' },
  ],
  dressCode: { title: 'Formal', note: 'de etiqueta · paleta neutra · evita blanco' },
  notes: [
    {
      title: 'Nuestra historia',
      text: 'Nos conocimos un domingo de café. Él pidió un americano, ella un capuccino con dos cucharadas de azúcar. Siete años después, todo lo que queremos es seguir despertando juntos cada domingo.',
    },
    {
      title: 'Celebración solo para adultos',
      text: 'Los niños son alegría, pero esta noche queremos que ustedes también descansen.',
    },
    {
      title: 'Mesa de regalos',
      text: 'Tu presencia es nuestro mejor regalo. Si deseas obsequiar algo, abrimos un fondo para nuestra luna de miel.',
    },
  ],
  music: { track: 'Mil Años', artist: 'Christina Perri · primer baile' },
  closing: { text: 'Con cariño,', signature: 'Te esperamos' },
}
