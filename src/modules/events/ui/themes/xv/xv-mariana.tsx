import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './xv-mariana.content'
import { PALETA } from './xv-mariana.palette'

/** «Encanto Musical» — Mariana. */
export const xv_marianaDefinition: ThemeDefinition = {
  key: 'xv-mariana',
  label: 'Encanto Musical',
  categorySlug: 'xv-anos',
  palette: PALETA,
  fonts: ['greatVibes', 'italiana', 'cinzel', 'dmSans', 'cormorant', 'jetbrainsMono'],
  sections: ['hero', 'quote', 'hosts', 'schedule', 'reception', 'map', 'itinerary', 'music', 'dressCode', 'gallery', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./xv-mariana.view').then((modulo) => modulo.XvMarianaView)),
}
