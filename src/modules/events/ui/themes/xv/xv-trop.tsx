import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './xv-trop.content'
import { PALETA } from './xv-trop.palette'

/** «Sunset» — Ximena, de `xv-premium.jsx`. Tropical frente al mar. */
export const xvTropDefinition: ThemeDefinition = {
  key: 'xv-trop',
  label: 'Sunset',
  categorySlug: 'xv-anos',
  palette: PALETA,
  fonts: ['dmSans', 'italiana', 'jetbrainsMono', 'cinzel', 'cormorant', 'spaceGrotesk'],
  rsvp: 'botones',
  pinta: {
    // El mosaico son cinco, y el retrato frente al mar.
    fotos: { casillas: 5, retrato: true },
    sinCampos: {
      // «Playa del atardecer» es el rótulo de la portada, tras «MIS XV».
      hero: ['nameB', 'monogram', 'serial', 'coverImageId'],
      reception: ['label', 'address', 'time'],
      map: ['label'],
      itinerary: ['imageId'],
    },
    maxAvisos: 0,
  },
  sections: ['hero', 'schedule', 'reception', 'map', 'itinerary', 'gallery', 'music'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./xv-trop.view').then((modulo) => modulo.XvTropView)),
}
