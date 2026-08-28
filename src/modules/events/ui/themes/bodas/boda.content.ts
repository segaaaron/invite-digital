import type { InvitationContent } from '../../../domain/invitation-content'

/**
 * El contenido de muestra de «Étoile», copiado de la maqueta.
 *
 * Es lo que se ve en el escaparate del catálogo y lo que se siembra al elegir este diseño,
 * para que la invitación se vea terminada desde el primer segundo. En cuanto el atelier
 * escribe lo suyo, deja de usarse bloque a bloque.
 */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: {
    eyebrow: 'SAVE THE DATE',
    nameA: 'Camila',
    nameB: 'Mateo',
    monogram: 'C & M',
    serial: 'N° 014',
  },
  schedule: { startsAt: '2026-11-14T17:00:00' },
  ceremony: {
    label: 'CEREMONIA',
    time: '17:00',
    place: 'Iglesia San Esteban',
    address: 'Calle Real 24, Centro',
  },
  reception: {
    label: 'RECEPCIÓN',
    time: '19:30',
    place: 'Viñedo La Aurora',
    address: 'Km 12, Ruta del Vino',
  },
  map: { label: 'VIÑEDO LA AURORA', coords: '20.71°N · 100.45°W' },
  itinerary: [
    { time: '17:00', label: 'Ceremonia religiosa' },
    { time: '18:30', label: 'Cóctel de bienvenida' },
    { time: '20:00', label: 'Cena de gala' },
    { time: '22:00', label: 'Primer baile' },
    { time: '00:00', label: 'Brindis & DJ' },
  ],
  music: { track: 'At Last', artist: 'Etta James · primer baile' },
  dressCode: { title: 'Black Tie', note: 'Etiqueta rigurosa · No blanco' },
  gallery: [{ label: '2018' }, { label: 'Italia' }, { label: 'Propuesta' }, { label: 'Hoy' }],
  closing: { text: 'Tu presencia es nuestro mejor regalo' },
}
