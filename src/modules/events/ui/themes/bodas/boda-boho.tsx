import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './boda-boho.content'
import { PALETA } from './boda-boho.palette'

/**
 * «Pampas y Flores Secas» — Sara & Óscar, de `wedding-variants-10.jsx`.
 *
 * La Editorial boho: las pampas con su velo crema de fondo, cajas de vidrio dorado, el
 * retrato difuminado por los bordes y el itinerario en rejilla de dos con iconos de línea.
 */
export const bodaBohoDefinition: ThemeDefinition = {
  key: 'boda-boho',
  label: 'Pampas y Flores Secas',
  categorySlug: 'boda',
  palette: PALETA,
  fonts: ['spectral', 'jetbrainsMono', 'greatVibes'],
  rsvp: 'pildoras',
  pinta: {
    // Seis en el carrusel y el retrato grande de arriba.
    fotos: { casillas: 6, retrato: true },
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
  Component: dynamic(() => import('./boda-boho.view').then((modulo) => modulo.BodaBohoView)),
}
