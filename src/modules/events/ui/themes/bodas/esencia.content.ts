import type { InvitationContent } from '../../../domain/invitation-content'

/**
 * El contenido de muestra de «Esencia», copiado de su maqueta (`esencia.jsx`,
 * `EsenciaWedding`): la boda de Valentina & Mateo.
 */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: {
    eyebrow: 'Celebramos nuestra boda',
    nameA: 'Valentina',
    nameB: 'Mateo',
    monogram: 'V & M',
  },
  quote: {
    text: '"Hemos esperado este momento con todo el corazón. Queremos compartir nuestra felicidad contigo, porque sin ti, esta historia no estaría completa."',
  },
  schedule: { startsAt: '2027-12-20T17:00:00' },
  ceremony: {
    label: 'Religiosa',
    place: 'Parroquia San Martín',
    address: 'Av. Heroínas #342, Cochabamba, Bolivia',
    time: '17:00 HRS',
  },
  reception: {
    label: 'Celebración',
    place: 'Jardín Las Magnolias',
    address: 'Av. del Ejército #1120, Cochabamba, Bolivia',
    time: '19:30 HRS',
  },
  map: { label: 'JARDÍN LAS MAGNOLIAS', coords: '17.39°S · 66.15°O' },
  itinerary: [
    { time: '17:00', label: 'Ceremonia religiosa' },
    { time: '18:30', label: 'Recepción y coctel' },
    { time: '19:00', label: 'Brindis' },
    { time: '20:00', label: 'Cena' },
    { time: '21:30', label: 'Primer baile' },
    { time: '22:00', label: 'Lanzamiento de bouquet' },
    { time: '22:30', label: 'Fiesta libre' },
  ],
  dressCode: {
    title: 'Formal',
    note: 'Evitar color blanco, por favor',
    colors: ['#1a1a18', '#b8956a', '#f0eae0', '#8b9080'],
  },
  music: { track: 'Nuestra canción', artist: 'Valentina & Mateo' },
  closing: {
    text: 'Será un honor tenerte con nosotros',
    signature: 'Valentina & Mateo',
  },
}
