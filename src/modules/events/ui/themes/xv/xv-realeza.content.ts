import type { InvitationContent } from '../../../domain/invitation-content'

/** El contenido de muestra de «Realeza Cristal», copiado de su maqueta (`xv-realeza.jsx`). */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: { nameA: 'Camila' },
  quote: { text: '"A las doce todo puede cambiar... pero esta noche, el cuento comienza para siempre."' },
  schedule: { startsAt: '2026-12-12T19:00:00' },
  reception: { place: 'Salón Castillo Azul' },
  map: { coords: '19.34°N · 99.19°W' },
  itinerary: [
    { time: '19:00', label: 'Llegada de la princesa', note: 'Carruaje de cristal' },
    { time: '19:30', label: 'Ceremonia & vals', note: 'Salón Castillo Azul' },
    { time: '20:30', label: 'Sesión de fotos' },
    { time: '21:30', label: 'Cena de gala' },
    { time: '23:00', label: 'Baile hasta la medianoche' },
  ],
  music: { track: 'Bibbidi-Bobbidi Waltz', artist: 'Orquesta de cuerdas' },
  dressCode: { title: 'Azul cristal & dorado', note: 'Con cariño, evita el tono azul cielo — reservado para la quinceañera.' },
  gallery: [{ label: 'castillo' }, { label: 'carruaje' }, { label: 'zapatilla' }, { label: 'hoy' }],
  closing: { text: 'Y vivieron felices para siempre' },
}
