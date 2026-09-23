import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './xv-min.content'
import { PALETA } from './xv-min.palette'

/** «Editorial» — Sofía, de `xv-variants.jsx`. Revista mínima en papel, tinta e iris. */
export const xvMinDefinition: ThemeDefinition = {
  key: 'xv-min',
  label: 'Editorial',
  categorySlug: 'xv-anos',
  palette: PALETA,
  fonts: ['spectral', 'jetbrainsMono', 'cinzel', 'cormorant', 'spaceGrotesk'],
  rsvp: 'botones',
  pinta: {
    // Solo el retrato a sangre: no hay galería.
    fotos: { casillas: 0, retrato: true },
    sinCampos: {
      hero: ['eyebrow', 'nameB', 'monogram', 'serial', 'coverImageId'],
      reception: ['label', 'time'],
      map: ['label'],
      itinerary: ['imageId'],
      dressCode: ['note', 'detail'],
    },
    maxAvisos: 1,
  },
  sections: ['hero', 'quote', 'schedule', 'reception', 'map', 'itinerary', 'dressCode', 'notes'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./xv-min.view').then((modulo) => modulo.XvMinView)),
}
