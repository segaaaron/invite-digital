import type { InvitationContent } from '../../../domain/invitation-content'

/**
 * El contenido de muestra de «Botánica», copiado de la maqueta.
 *
 * En el itinerario, `imageId` es la **clave del icono** —`church`, `flutes`, `cake`— y no
 * una imagen del evento: la fila ya tiene un sitio para decir cómo se ilustra, y ningún
 * diseño usa las dos cosas a la vez.
 */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: {
    eyebrow: '¡NOS CASAMOS!',
    nameA: 'Marcia',
    nameB: 'Ricardo',
    monogram: 'M & R',
  },
  // Tres piezas y en este orden, como el diseño las compone: la frase, los años y la
  // historia que va bajo «nuestra historia».
  quote: {
    text: '"and they lived\nhappily ever after"\n\n2019 — 2026\n\nNos conocimos un domingo de café. Él pidió un americano, ella un capuccino con dos cucharadas de azúcar. Siete años después, todo lo que queremos es seguir despertando juntos cada domingo.',
  },
  schedule: { startsAt: '2026-10-18T16:00:00' },
  // Los seis nombres van en tres parejas y en este orden: padres de la novia, padres del
  // novio y padrinos. Es el orden en que el diseño los rotula.
  hosts: {
    label: 'Con la bendición de Dios y de nuestros padres',
    names: [
      'Isabel Fuentes de Alcázar',
      'Joaquín Alcázar Rivas',
      'Rosario Linares de Bermúdez',
      'Emilio Bermúdez Salgado',
      'Amparo Céspedes de Ordóñez',
      'Rodrigo Ordóñez Villalba',
    ],
  },
  ceremony: {
    label: 'Ceremonia Religiosa',
    place: 'Parroquia San Mateo',
    address: 'Av. Iglesia 14, Centro',
    time: '16:00 h',
  },
  reception: {
    label: 'Recepción Social',
    place: 'Hacienda La Aurora',
    address: 'Km 8 Carretera del Lago',
    time: '18:00 h',
  },
  // Con enlace: es lo que enciende el botón «ver ubicación» de las dos tarjetas. Sin él no
  // se pinta el botón, que es lo correcto —un botón que no lleva a ninguna parte es peor
  // que no tenerlo—.
  map: {
    label: 'HACIENDA LA AURORA',
    coords: '19.32°N · 99.18°W',
    href: 'https://maps.google.com/?q=19.32,-99.18',
  },
  itinerary: [
    { time: '16:00 h', label: 'Ceremonia Religiosa', imageId: 'church' },
    { time: '18:00 h', label: 'Recepción Social', imageId: 'envelope' },
    { time: '18:30 h', label: 'Brindis', imageId: 'flutes' },
    { time: '20:00 h', label: 'Cena', imageId: 'dinner' },
    { time: '22:00 h', label: 'Lanzamiento de bouquet', imageId: 'bouquet' },
    { time: '22:30 h', label: 'Comienza la fiesta', imageId: 'disco' },
  ],
  music: { track: 'A Thousand Years', artist: 'Christina Perri · primer baile' },
  dressCode: {
    title: 'Formal',
    note: 'CÓDIGO DE VESTIMENTA',
    detail: 'de etiqueta · paleta neutra · evita blanco',
  },
  // La primera es la portada; la segunda, la fotografía grande que va bajo la frase; las
  // tres últimas, el collage. Cada una cae en su sitio por orden, y sin fotografía propia
  // se ve la del diseño.
  gallery: [
    { label: 'MARCIA & RICARDO' },
    { label: 'MOMENTO ESPECIAL' },
    { label: 'ANILLOS' },
    { label: 'FLORES' },
    { label: 'PASTEL' },
  ],
  // Los tres textos que el diseño lleva escritos: la invitación que precede al nombre del
  // invitado, el aviso de solo adultos y la petición de fotografías.
  notes: [
    { title: 'Nuestro gran día', text: 'Nuestro gran día se aproxima y nos encantaría que formaras parte de él.' },
    {
      title: 'CELEBRACIÓN SOLO PARA ADULTOS',
      text: 'Los niños son alegría, pero esta noche queremos que ustedes también descansen.',
    },
    {
      title: 'Comparte tus fotos',
      text: 'Sube aquí las fotos que tomes durante el día. Nos encantará ver la boda desde tus ojos.',
    },
  ],
  closing: { text: 'con cariño,', signature: 'Marcia & Ricardo' },
}
