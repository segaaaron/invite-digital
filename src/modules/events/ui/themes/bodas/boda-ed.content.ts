import type { InvitationContent } from '../../../domain/invitation-content'

/** El contenido de muestra de «Editorial», copiado de la maqueta. */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: {
    eyebrow: '· INSIDE ·',
    nameA: 'María',
    nameB: '& Alex',
    monogram: 'VOL. I · NO. 09',
    serial: '· TIE THE KNOT · 20.09.2026 ·',
  },
  // Dos párrafos separados por línea en blanco: el primero es la cita destacada que el
  // diseño pone entre filetes, el resto es la columna con capitular.
  quote: {
    text: 'Nos casamos un domingo, porque los domingos tienen ese aire de promesa cumplida.\n\nFue en una librería de viejo, una tarde de septiembre. María buscaba a Borges. Alex tropezó con su pila de libros. Se cayeron tres tomos y un cuaderno de notas con dibujos. Lo demás, como suele decirse, es historia.',
  },
  schedule: { startsAt: '2026-09-20T18:00:00' },
  reception: {
    label: 'THE PLACE',
    place: 'Hacienda Los Sauces',
    address: '· KM 22 CARRETERA REAL · GTO ·',
    time: 'Construida en 1879. Quince hectáreas. Un único roble en el patio.',
  },
  map: { label: 'LOS SAUCES', coords: '20.51°N · 100.81°W' },
  itinerary: [
    { time: '16:00', label: 'Welcome cocktail', note: 'Jardín de la entrada' },
    { time: '17:30', label: 'Ceremonia civil', note: 'Bajo el roble centenario' },
    { time: '18:30', label: 'Brindis & canapés', note: 'Terraza norte' },
    { time: '20:00', label: 'Cena de gala', note: 'Salón Principal' },
    { time: '22:00', label: 'Discurso & primer baile' },
    { time: '23:00', label: 'DJ set · Frida Vega', note: 'Open bar' },
    { time: '02:00', label: 'Vamos a casa', note: '(o no)' },
  ],
  dressCode: {
    title: 'Dress, code.',
    note: 'THE LOOK',
    detail: 'Formal · paleta tierra · tejidos naturales · sin blanco · sin nude · sin neón.',
  },
  gallery: [
    { label: 'EDITORIAL COVER · MARÍA & ALEX' },
    { label: 'FIG. 02 · MARÍA, IN HER STUDIO · BY F. RIVERA' },
  ],
  closing: { text: 'fin del volumen.', signature: 'VOWS · ISSUE 09 · 2026' },
}
