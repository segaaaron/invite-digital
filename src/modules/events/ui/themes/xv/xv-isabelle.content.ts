import type { InvitationContent } from '../../../domain/invitation-content'

/**
 * El contenido de muestra de «Palacio Griego», copiado de la maqueta.
 *
 * La cita son tres piezas y en este orden, como el diseño las compone: la frase, los años y
 * la historia que va bajo «mi historia».
 *
 * El cronograma son cinco hitos y no seis: este diseño los pinta en una rejilla de dos
 * columnas con el último centrado debajo, y una fila de más le rompe la simetría.
 */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: {
    eyebrow: 'MIS XV AÑOS',
    nameA: 'Isabelle',
    monogram: 'I',
  },
  quote: {
    text: '"hoy florezco\ny celebro quien soy"\n\n2011 — 2026\n\nQuince años de risas, sueños y momentos que hoy se convierten en la celebración más especial. Gracias por ser parte de mi historia y por acompañarme en esta nueva etapa.',
  },
  hosts: {
    label: 'Agradecida por el amor y cuidado de mis padres',
    names: ['Juan Julio Pereira', 'Linzi Torrico'],
  },
  schedule: { startsAt: '2026-11-14T17:00:00' },
  ceremony: { label: 'CEREMONIA', place: 'Parroquia Santa Isabel', address: 'Av. de la Fe 22, Centro', time: '17:00 h' },
  reception: {
    label: 'RECEPCIÓN',
    place: 'Jardín Las Magnolias',
    address: 'Km 5 Carretera al Bosque',
    time: '18:30',
  },
  map: { label: 'JARDÍN LAS MAGNOLIAS', coords: '19.32°N · 99.18°W' },
  itinerary: [
    { time: '18:30', label: 'RECEPCIÓN SOCIAL', imageId: 'envelope' },
    { time: '21:00', label: 'CENA', imageId: 'dinner' },
    { time: '23:00', label: 'BAILE SORPRESA', imageId: 'disco' },
    { time: '00:00', label: 'TORTA', imageId: 'cake' },
    { time: '01:00', label: 'DESPEDIDA', imageId: 'bouquet' },
  ],
  music: { track: 'Tiempo de Vals', artist: 'Chayanne · vals oficial' },
  dressCode: { title: 'Formal', note: 'CÓDIGO DE VESTIMENTA', detail: 'formal · tonos tierra · evita blanco' },
  gallery: [{ label: 'ISABELLE' }],
  // La copia del bloque de regalos, que este diseño lleva escrita.
  notes: [
    {
      title: 'Tu presencia es mi mejor regalo',
      text: 'Si deseas obsequiarme algo, tu detalle en sobre será muy bien recibido.',
    },
  ],
  closing: { text: 'Te espero para celebrar juntos esta bella noche.', signature: 'Isabelle' },
}
