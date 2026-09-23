import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './xv-deco.content'
import { PALETA } from './xv-deco.palette'

/** «Art Déco» — Alessandra, de `xv-premium.jsx`. Negro humo y oro, gala imperial. */
export const xvDecoDefinition: ThemeDefinition = {
  key: 'xv-deco',
  label: 'Art Déco',
  categorySlug: 'xv-anos',
  palette: PALETA,
  fonts: ['cormorant', 'italiana', 'jetbrainsMono', 'cinzel'],
  rsvp: 'botones',
  pinta: {
    // La tira de fotomatón son cuatro, y el retrato Gatsby.
    fotos: { casillas: 4, retrato: true },
    sinCampos: {
      hero: ['eyebrow', 'nameB', 'monogram', 'serial', 'coverImageId'],
      // Del salón solo se pinta el nombre, en el rótulo del mapa.
      reception: ['label', 'address', 'time'],
      map: ['label'],
      itinerary: ['imageId'],
    },
    maxAvisos: 0,
  },
  sections: ['hero', 'schedule', 'reception', 'map', 'itinerary', 'gallery', 'music'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./xv-deco.view').then((modulo) => modulo.XvDecoView)),
}
