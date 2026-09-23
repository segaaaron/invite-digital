import type { InvitationContent } from '../../../domain/invitation-content'

/**
 * El contenido de muestra de «Glamour», copiado de su maqueta (`wedding-variants.jsx`,
 * `WeddingBotanical`): la boda de Valeria & Nicolas.
 */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: { eyebrow: 'Nuestra Boda', nameA: 'Valeria', nameB: 'Nicolas' },
  quote: { text: '"Un amor que florece cada día."' },
  schedule: { startsAt: '2026-11-28T16:00:00' },
  hosts: {
    label: 'Con la bendición de Dios y de nuestros padres',
    names: ['Carmen Robles', 'Ricardo Vargas', 'Lucía Mendoza', 'Fernando Terán', 'Alejandra Gutiérrez', 'Roberto Salazar'],
    roles: {
      brideMother: 'Carmen Robles',
      brideFather: 'Ricardo Vargas',
      groomMother: 'Lucía Mendoza',
      groomFather: 'Fernando Terán',
      godparents: ['Alejandra Gutiérrez', 'Roberto Salazar'],
    },
  },
  ceremony: { label: 'Ceremonia Religiosa', place: 'Parroquia San Rafael', time: '16:00' },
  reception: { label: 'Recepción Social', place: 'Salón Los Cedros', time: '18:30' },
  map: { label: 'SALÓN LOS CEDROS', coords: '17.39°S · 66.15°O' },
  itinerary: [
    { time: '16:00', label: 'Ceremonia' },
    { time: '18:30', label: 'Recepción' },
    { time: '19:30', label: 'Vals' },
    { time: '21:00', label: 'Cena' },
    { time: '22:30', label: 'Torta' },
    { time: '00:00', label: 'Fiesta' },
  ],
  dressCode: { title: 'Código de vestimenta', note: 'Formal · tonos tierra y dorado · sin blanco' },
  notes: [
    {
      text: 'Nos conocimos en el lugar menos esperado y desde entonces no hemos dejado de escribir nuestra historia. Hoy queremos compartir con ustedes el capítulo más importante.',
    },
    { text: 'Los niños son alegría, pero esta noche queremos que ustedes también descansen.' },
    { text: 'Su presencia es nuestro mejor regalo.' },
  ],
  music: { track: 'Nuestra canción', artist: 'Valeria & Nicolas' },
  closing: { text: 'Te esperamos.', signature: 'Valeria & Nicolas' },
}
