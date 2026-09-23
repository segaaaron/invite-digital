import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './xv-realeza.content'
import { PALETA } from './xv-realeza.palette'

/** «Realeza Cristal» — Camila, de `xv-realeza.jsx`. Carruaje y zapatilla de cristal. */
export const xvRealezaDefinition: ThemeDefinition = {
  key: 'xv-realeza',
  label: 'Realeza Cristal',
  categorySlug: 'xv-anos',
  palette: PALETA,
  fonts: ['cormorant', 'greatVibes', 'jetbrainsMono', 'cinzel'],
  rsvp: 'botones',
  pinta: {
    // El mosaico son cinco, y el retrato bajo el arco.
    fotos: { casillas: 5, retrato: true },
    sinCampos: {
      hero: ['eyebrow', 'nameB', 'monogram', 'serial', 'coverImageId'],
      reception: ['label', 'address', 'time'],
      map: ['label'],
      itinerary: ['imageId'],
      dressCode: ['detail', 'colors'],
      closing: ['signature'],
    },
    maxAvisos: 0,
  },
  sections: ['hero', 'quote', 'schedule', 'reception', 'map', 'itinerary', 'music', 'dressCode', 'gallery', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./xv-realeza.view').then((modulo) => modulo.XvRealezaView)),
}
