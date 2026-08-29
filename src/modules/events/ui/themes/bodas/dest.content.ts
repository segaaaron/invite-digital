import type { InvitationContent } from '../../../domain/invitation-content'

/** El contenido de muestra de «Destino», copiado de la maqueta. */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: {
    // El rótulo de la portada, el que se lee antes de abrir.
    eyebrow: 'DESTINATION · TULUM',
    nameA: 'Alejandra',
    nameB: 'Pablo',
    monogram: 'TULUM · MÉXICO',
    serial: '14 · FEB · 2027',
  },
  schedule: { startsAt: '2027-02-14T16:00:00' },
  reception: {
    label: 'HOSPEDAJE RECOMENDADO',
    place: 'Hotel Azulik · Habitas Tulum · Nômade',
    address: 'Cupones exclusivos para invitados con el código BODA-TULUM26',
  },
  // Cuatro días, no cuatro horas: en una boda de destino el itinerario es el viaje.
  itinerary: [
    { time: '13 FEB', label: 'Welcome cocktail · cenote' },
    { time: '14 FEB', label: 'Ceremonia 16:00 · playa' },
    { time: '15 FEB', label: 'Brunch · día libre' },
    { time: '16 FEB', label: 'Despedida · DJ sunset' },
  ],
  dressCode: {
    title: 'DRESS CODE',
    detail: 'Lino · pies descalzos · paleta tierra/arena · evita pesado',
  },
  quote: {
    text: 'Aeropuerto Cancún (CUN) → traslado disponible. Escríbenos y te pasamos la guía completa de viaje.',
  },
  gallery: [
    { label: 'PAREJA · BEACH' },
    { label: 'cenote' },
    { label: 'playa' },
    { label: 'selva' },
    { label: 'atardecer' },
    { label: 'tequila' },
  ],
  closing: { text: 'Nos vemos con los pies en la arena.', signature: 'A & P' },
}
