import type { InvitationContent } from '../../../domain/invitation-content'

/**
 * El contenido de muestra de «Cinemática», copiado de la maqueta V3.
 *
 * La cita son tres párrafos, como en «Editorial»: el titular con sus saltos de línea, la
 * firma y la columna con capitular. En el itinerario, `imageId` es el icono: la casilla
 * `0` a `5` de la lámina dorada, o `copas` y `auto`.
 */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: {
    eyebrow: 'NUESTRA BODA',
    monogram: '· SOFÍA & DIEGO ·',
    nameA: 'Sofía',
    nameB: '& Diego',
    serial: '· NOS CASAMOS · 12.12.2026 ·',
  },
  quote: {
    text: '"Supe que eras tú\nla primera vez\nque me miraste."\n\n— DIEGO\n\nNos conocimos en una noche cualquiera que terminó no siendo cualquiera. Desde entonces, cada día ha sido la confirmación de que encontramos a nuestra persona. Hoy, con el corazón lleno de gratitud, queremos compartir con quienes amamos el inicio de nuestra historia como esposos.',
  },
  hosts: {
    label: 'Con la bendición de Dios y de nuestros padres',
    names: [
      'Marcela Rojas de Salinas',
      'Julio Salinas Peña',
      'Verónica Aguilar de Campos',
      'Raúl Campos Herrera',
      'Isabel Marín de Prado',
      'Gonzalo Prado Vega',
    ],
  },
  schedule: { startsAt: '2026-12-12T19:00:00' },
  ceremony: { label: 'Ceremonia Religiosa', place: 'Parroquia San Rafael', time: '13:00' },
  reception: { label: 'Recepción Social', place: 'Salón Los Cedros', time: '15:00' },
  itinerary: [
    { time: '16:00 h', label: 'Ceremonia', imageId: '0' },
    { time: '18:00 h', label: 'Recepción Social', imageId: '1' },
    { time: '18:30 h', label: 'Vals y Brindis', imageId: 'copas' },
    { time: '20:00 h', label: 'Cena', imageId: '3' },
    { time: '20:30 h', label: 'A bailar', imageId: '2' },
    { time: '00:00 h', label: 'Fin de la fiesta', imageId: 'auto' },
  ],
  dressCode: {
    note: 'GALA ELEGANTE',
    title: 'Código de vestimenta',
    detail: 'Formal · negro y dorado · sin blanco · sin colores pastel · sin neón.',
  },
  gallery: [
    { label: 'Sofía y Diego' },
    { label: 'Nosotros' },
    { label: 'Nosotros' },
    { label: 'Nosotros' },
    { label: 'Nosotros' },
  ],
  notes: [
    { title: 'Nuestro gran día', text: 'Nuestro gran día se aproxima y nos encantaría que formaras parte de él.' },
    { title: 'CELEBRACIÓN SOLO PARA ADULTOS', text: 'Los niños son alegría, pero esta noche queremos que ustedes también descansen.' },
    {
      title: 'Mesa de regalos',
      text: 'Su presencia es nuestro mejor regalo. Si además desean tener un detalle con nosotros, les dejamos algunas ideas.',
    },
    { title: 'Comparte tus fotos', text: 'Sube aquí las fotos que tomes durante el día. Nos encantará ver la boda desde tus ojos.' },
  ],
  closing: { text: 'Te esperamos.', signature: 'SOFÍA & DIEGO' },
}
