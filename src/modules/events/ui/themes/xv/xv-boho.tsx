import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './xv-boho.content'
import { PALETA } from './xv-boho.palette'

/** «Bohemia» — Renata, de `xv-premium.jsx`. Silvestre, flores de campo. */
export const xvBohoDefinition: ThemeDefinition = {
  key: 'xv-boho',
  label: 'Bohemia',
  categorySlug: 'xv-anos',
  palette: PALETA,
  fonts: ['newsreader', 'greatVibes', 'jetbrainsMono', 'cinzel', 'cormorant'],
  rsvp: 'botones',
  pinta: {
    // El collage asimétrico son tres, y el retrato bajo el arco.
    fotos: { casillas: 3, retrato: true },
    sinCampos: {
      hero: ['eyebrow', 'nameB', 'monogram', 'serial', 'coverImageId'],
      // Del salón solo se pinta el nombre, en el rótulo del mapa.
      reception: ['label', 'address', 'time'],
      map: ['label'],
      itinerary: ['imageId'],
    },
    maxAvisos: 0,
  },
  sections: ['hero', 'quote', 'schedule', 'reception', 'map', 'itinerary', 'gallery', 'music'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./xv-boho.view').then((modulo) => modulo.XvBohoView)),
}
