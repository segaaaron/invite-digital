import type { InvitationContent } from '../../../domain/invitation-content'

/**
 * El contenido de muestra de «Floral Elegante», copiado de su maqueta (`xv-elegante.jsx`,
 * `QuinceEleganteFloral`).
 *
 * Los tres avisos son los tres textos del final: la sugerencia de regalos, los datos de la
 * cuenta (uno por línea) y la nota de que la fiesta es para adolescentes y adultos.
 */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: { nameA: 'Ximena' },
  quote: {
    text: '"Hay momentos inolvidables que se atesoran con el corazón para siempre. Por esa razón, con alegría y emoción, quiero compartir contigo esta noche maravillosa celebrando juntos mis XV años."',
  },
  hosts: {
    label: 'Acompáñame en este día tan especial junto a mis padres:',
    names: ['Rafael López', 'Emilia Peredo', 'Freddy Pérez', 'Mónica Bernal'],
    roles: { father: 'Rafael López', mother: 'Emilia Peredo', godparents: ['Freddy Pérez', 'Mónica Bernal'] },
  },
  schedule: { startsAt: '2026-03-14T17:30:00' },
  ceremony: { label: 'Misa de Agradecimiento', place: 'Iglesia Sagrado Corazón', address: 'El Nevado Manzana 009, Toluca de Lerdo', time: '6:00 PM' },
  reception: { label: 'Recepción', place: 'Salón de Fiestas Quinta la Bonita', address: 'De los Jinetes Manzana.', time: '7:00 PM' },
  itinerary: [
    { time: '5:30 PM', label: 'Llegada' },
    { time: '5:50 PM', label: 'Vals' },
    { time: '6:00 PM', label: 'Sesión de fotos' },
    { time: '10:30 PM', label: 'Fiesta' },
    { time: '02:00 AM', label: 'Despedida' },
  ],
  music: { track: 'Vals de Ximena', artist: 'Selección musical' },
  dressCode: {
    title: 'Etiqueta',
    note: 'Con mucho cariño, les pedimos evitar el tono rosa pastel, ya que está reservado especialmente para la quinceañera.',
  },
  gallery: [
    { label: 'SESIÓN · ATARDECER' },
    { label: 'RETRATO · COLUMNAS' },
    { label: 'ramo' },
    { label: 'lago' },
    { label: 'familia' },
    { label: 'hoy' },
  ],
  notes: [
    {
      title: 'Sugerencia de regalos',
      text: 'Ahora mis sueños se materializan lejos de mi querida ciudad blanca, que siempre llevo en mi corazón. Si deseas apoyarme puedes hacerlo con una transferencia. Gracias por cada detalle.',
    },
    { text: 'BANCO ABC\nCUENTA DE AHORRO\nNOMBRE Y APELLIDO\n1111-2222-333-4444' },
    {
      text: 'Con mucho cariño. Esta celebración es para que adolescentes y adultos puedan compartir y disfrutar juntos. Tu presencia y alegría hará que esta noche sea inolvidable.',
    },
  ],
  closing: { text: '¡Te esperamos!' },
}
