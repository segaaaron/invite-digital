import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './boda-perla.content'
import { PALETA } from './boda-perla.palette'

/**
 * «Marco Perlado» — Emma & Gael, de `wedding-variants-8.jsx`.
 *
 * La Editorial en marfil: el marco de flores blancas y perlas de fondo, hojas blancas
 * cayendo, piezas de arte que flotan y el itinerario en zigzag a los dos lados de un hilo.
 */
export const bodaPerlaDefinition: ThemeDefinition = {
  key: 'boda-perla',
  label: 'Marco Perlado',
  categorySlug: 'boda',
  palette: PALETA,
  fonts: ['spectral', 'jetbrainsMono', 'greatVibes', 'playfairDisplay', 'montserrat', 'cormorant', 'dmSans'],
  rsvp: 'pildoras',
  pinta: {
    // Cinco en el carrusel y el retrato grande de arriba.
    fotos: { casillas: 5, retrato: true },
    sinCampos: {
      hero: ['coverImageId'],
      ceremony: ['address'],
      reception: ['address'],
      map: ['label'],
      itinerary: ['note', 'imageId'],
      dressCode: ['detail'],
      gallery: ['label'],
    },
    maxAvisos: 3,
  },
  sections: ['hero', 'quote', 'schedule', 'hosts', 'ceremony', 'reception', 'map', 'itinerary', 'gallery', 'dressCode', 'notes', 'music', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./boda-perla.view').then((modulo) => modulo.BodaPerlaView)),
}
