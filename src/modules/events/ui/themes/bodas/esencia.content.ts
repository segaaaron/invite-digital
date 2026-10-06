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
  hosts: {
    names: ['Roberto Salinas', 'Mariana Ortiz', 'Andrés Herrera', 'Lucía Morales', 'Carlos y Elena Vega', 'Jorge y Patricia Ruiz', 'Fernando y Sofía Navarro'],
    roles: {
      brideFather: 'Roberto Salinas',
      brideMother: 'Mariana Ortiz',
      groomFather: 'Andrés Herrera',
      groomMother: 'Lucía Morales',
      godparents: ['Carlos y Elena Vega', 'Jorge y Patricia Ruiz', 'Fernando y Sofía Navarro'],
    },
  },
  schedule: { startsAt: '2027-12-20T17:00:00' },
  ceremony: {
    label: 'Religiosa',
    place: 'Parroquia San Martín',
    time: '17:00 HRS',
  },
  reception: {
    label: 'Celebración',
    place: 'Jardín Las Magnolias',
    time: '18:30 HRS',
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
  // El primero es la línea de «solo adultos»; los demás, los hitos de «Nuestra historia».
  notes: [
    { title: 'Evento solo para adultos' },
    { title: '2019', text: 'Nos conocimos' },
    { title: '2022', text: 'Nuestro primer viaje juntos' },
    { title: '2026', text: 'Dijimos que sí' },
  ],
  music: { track: 'Nuestra canción', artist: 'Valentina & Mateo' },
  closing: {
    text: 'Será un honor tenerte con nosotros',
    signature: 'Valentina & Mateo',
  },
}
