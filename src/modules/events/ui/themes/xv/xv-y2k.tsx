import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './xv-y2k.content'
import { PALETA } from './xv-y2k.palette'

/** «Y2K Galaxy» — Mariana, de `xv-variants.jsx`. Los dos mil en galaxia holográfica. */
export const xvY2kDefinition: ThemeDefinition = {
  key: 'xv-y2k',
  label: 'Y2K Galaxy',
  categorySlug: 'xv-anos',
  palette: PALETA,
  fonts: ['spaceGrotesk', 'italiana', 'jetbrainsMono', 'cinzel', 'cormorant'],
  rsvp: 'botones',
  pinta: {
    // La tira de fotomatón son cuatro, y el retrato con aro holográfico.
    fotos: { casillas: 4, retrato: true },
    sinCampos: {
      hero: ['eyebrow', 'nameB', 'monogram', 'serial', 'coverImageId'],
      // La hora de la ficha es la de la recepción; el lugar, su «VENUE».
      reception: ['label', 'address'],
      // Del código de vestimenta, solo la línea «DRESS».
      dressCode: ['note', 'detail', 'colors'],
    },
    maxAvisos: 2,
  },
  sections: ['hero', 'quote', 'schedule', 'reception', 'map', 'dressCode', 'notes', 'gallery', 'music'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./xv-y2k.view').then((modulo) => modulo.XvY2kView)),
}
