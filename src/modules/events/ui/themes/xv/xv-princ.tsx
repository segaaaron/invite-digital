import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './xv-princ.content'
import { PALETA } from './xv-princ.palette'

/** «Princesa Real» — Valentina, de `xv-variants.jsx`. Rosa algodón, corona de joyas. */
export const xvPrincDefinition: ThemeDefinition = {
  key: 'xv-princ',
  label: 'Princesa Real',
  categorySlug: 'xv-anos',
  palette: PALETA,
  fonts: ['cormorant', 'greatVibes', 'jetbrainsMono', 'cinzel'],
  rsvp: 'botones',
  pinta: {
    // Las cuatro polaroids, y el retrato bajo el arco.
    fotos: { casillas: 4, retrato: true },
    sinCampos: {
      hero: ['eyebrow', 'nameB', 'monogram', 'serial', 'coverImageId'],
      map: ['label'],
      dressCode: ['note', 'detail', 'colors'],
    },
    maxAvisos: 4,
  },
  sections: ['hero', 'quote', 'schedule', 'ceremony', 'reception', 'map', 'gallery', 'notes', 'music', 'dressCode'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./xv-princ.view').then((modulo) => modulo.XvPrincView)),
}
