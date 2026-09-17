import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './xv-natalia.content'
import { PALETA } from './xv-natalia.palette'

/** «Encanto Marino» — Natalia. La composición marina en dorado sobre negro. */
export const xvNataliaDefinition: ThemeDefinition = {
  key: 'xv-natalia',
  label: 'Encanto Marino',
  categorySlug: 'xv-anos',
  palette: PALETA,
  fonts: ['greatVibes', 'alexBrush', 'italiana', 'cinzel', 'dmSans', 'cormorant', 'jetbrainsMono'],
  pinta: { fotos: { casillas: 0 }, sinCampos: { hero: ['nameB'], itinerary: ['note'] } },
  sections: ['hero', 'quote', 'hosts', 'schedule', 'reception', 'map', 'itinerary', 'music', 'dressCode', 'notes', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./xv-natalia.view').then((modulo) => modulo.XvNataliaView)),
}
