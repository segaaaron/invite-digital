import type { InvitationContent } from '../../../domain/invitation-content'

/** El contenido de muestra de «Compromiso», copiado de la maqueta. */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: {
    // El rótulo de la portada, el que se lee antes de abrir.
    eyebrow: 'ELLA DIJO QUE SÍ',
    // El titular del diseño va partido en dos tamaños: «Dijo» pequeño y «sí» enorme.
    nameA: 'Dijo',
    nameB: 'sí',
    monogram: 'C & M',
    serial: 'SE COMPROMETEN',
  },
  hosts: { label: 'SE COMPROMETEN', names: ['Camila & Mateo'] },
  quote: {
    text: 'Antes de la boda, queremos brindar contigo. Acompáñanos a celebrar nuestro sí.',
  },
  schedule: { startsAt: '2026-04-12T18:00:00' },
  reception: {
    label: '12 · ABR · 2026 · 18:00',
    place: 'Casa Aurora · Roof Garden',
    address: 'Av. Constitución 120, Centro',
  },
  map: { label: 'CASA AURORA', coords: '19.43°N · 99.13°W' },
  music: { track: 'Marry Me', artist: 'Train · porque sí' },
  gallery: [
    { label: 'LA PROPUESTA' },
    { label: 'primer beso' },
    { label: 'viaje' },
    { label: 'propuesta' },
    { label: 'anillo' },
  ],
  closing: { text: 'PARA LA FIESTA DE COMPROMISO', signature: 'C & M' },
}
