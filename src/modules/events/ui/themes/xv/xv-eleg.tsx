import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './xv-eleg.content'
import { PALETA } from './xv-eleg.palette'

/** «Floral Elegante» — Ximena, de `xv-elegante.jsx`. Arco de flores, misa y recepción. */
export const xvElegDefinition: ThemeDefinition = {
  key: 'xv-eleg',
  label: 'Floral Elegante',
  categorySlug: 'xv-anos',
  palette: PALETA,
  fonts: ['cormorant', 'greatVibes', 'jetbrainsMono'],
  rsvp: 'botones',
  pinta: {
    // El atardecer, las columnas y la tira de cuatro; y el retrato bajo el arco.
    fotos: { casillas: 6, retrato: true },
    sinCampos: {
      hero: ['eyebrow', 'nameB', 'monogram', 'serial', 'coverImageId'],
      map: ['label'],
      itinerary: ['note', 'imageId'],
      dressCode: ['detail', 'colors'],
      closing: ['signature'],
    },
    maxAvisos: 3,
  },
  sections: ['hero', 'quote', 'music', 'hosts', 'schedule', 'ceremony', 'reception', 'map', 'gallery', 'itinerary', 'dressCode', 'notes', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./xv-eleg.view').then((modulo) => modulo.XvElegView)),
}
