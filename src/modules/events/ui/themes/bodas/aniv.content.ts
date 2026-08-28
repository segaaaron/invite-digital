import type { InvitationContent } from '../../../domain/invitation-content'

/** El contenido de muestra de «Bodas de Oro», copiado de la maqueta. */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: {
    eyebrow: '· BODAS DE ORO ·',
    nameA: 'Doña Carmen',
    nameB: 'Don Eduardo',
    // Los años que se celebran. Van aquí y no clavados en el dibujo: no toda boda de oro
    // son cincuenta, y hay quien celebra las de plata con este mismo diseño.
    monogram: '50',
    serial: '1976 — 2026',
  },
  hosts: { label: 'HONRAMOS A', names: ['Doña Carmen & Don Eduardo'] },
  quote: {
    text: '50 años, 3 hijos, 7 nietos, 1 amor.\nAcompáñanos a celebrar la vida que han construido.',
  },
  schedule: { startsAt: '2026-08-08T19:00:00' },
  reception: {
    label: 'SÁBADO 8 · AGOSTO · 2026 · 19:00 HRS',
    place: 'Hacienda San Joaquín',
    address: 'Km 5 Carretera Tepoztlán · Morelos',
  },
  map: { label: 'HACIENDA SAN JOAQUÍN', coords: '18.98°N · 99.10°W' },
  music: { track: 'Bésame Mucho', artist: 'Consuelo Velázquez · su canción' },
  gallery: [
    { label: 'FOTO ORIGINAL · 1976' },
    { label: '1976' },
    { label: '1986' },
    { label: '2006' },
    { label: '2026' },
  ],
  closing: { text: 'medio siglo, juntos', signature: 'C & E' },
}
