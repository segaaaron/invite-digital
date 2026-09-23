import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './xv-vogue.content'
import { PALETA } from './xv-vogue.palette'

/** «Rosa Pastel» — Isabela, de `xv-premium.jsx`. Vogue, editorial nocturna en rosa. */
export const xvVogueDefinition: ThemeDefinition = {
  key: 'xv-vogue',
  label: 'Rosa Pastel',
  categorySlug: 'xv-anos',
  palette: PALETA,
  fonts: ['spectral', 'italiana', 'greatVibes', 'jetbrainsMono', 'cinzel', 'cormorant', 'spaceGrotesk'],
  rsvp: 'botones',
  pinta: {
    // El mosaico son cinco, y el retrato.
    fotos: { casillas: 5, retrato: true },
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
  Component: dynamic(() => import('./xv-vogue.view').then((modulo) => modulo.XvVogueView)),
}
