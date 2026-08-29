import type { InvitationContent } from '../../../domain/invitation-content'

/** El contenido de muestra de «Palacio Griego», copiado de la maqueta. */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: {
    eyebrow: 'MIS XV AÑOS',
    nameA: 'Isabelle',
    monogram: 'I',
  },
  // Tres piezas y en este orden, como el diseño las compone: la frase, los años y la
  // historia que va bajo «mi historia».
  quote: {
    text: 'Que cada paso te lleve donde el alma ya sabía que ibas.\n\n2011 — 2026\n\nQuince años de risas, sueños y momentos que hoy se convierten en la celebración más especial. Gracias por ser parte de mi historia y por acompañarme en esta nueva etapa.',
  },
  hosts: {
    label: 'Agradecida por el amor y cuidado de mis padres',
    names: ['Juan Julio Pereira', 'Linzi Torrico'],
  },
  schedule: { startsAt: '2026-11-14T17:00:00' },
  ceremony: { label: 'CEREMONIA', place: 'Iglesia de la Merced', address: 'Plaza Mayor s/n', time: '17:00 h' },
  reception: { label: 'RECEPCIÓN', place: 'Villa Helena', address: 'Camino de los Olivos 12', time: '19:00 h' },
  map: { label: 'VILLA HELENA', coords: '19.32°N · 99.18°W' },
  itinerary: [
    { time: '17:00 h', label: 'Ceremonia', imageId: 'church' },
    { time: '19:00 h', label: 'Recepción', imageId: 'envelope' },
    { time: '19:30 h', label: 'Brindis', imageId: 'flutes' },
    { time: '21:00 h', label: 'Cena', imageId: 'dinner' },
    { time: '23:00 h', label: 'Vals', imageId: 'bouquet' },
    { time: '23:30 h', label: 'Fiesta', imageId: 'disco' },
  ],
  music: { track: 'Tiempo de Vals', artist: 'Chayanne · vals oficial' },
  dressCode: { title: 'Formal', note: 'CÓDIGO DE VESTIMENTA', detail: 'de gala · paleta mármol y oro · evita blanco' },
  gallery: [{ label: 'ISABELLE' }],
  closing: { text: 'con cariño,', signature: 'Isabelle' },
}
