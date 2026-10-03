import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './xv-fantasia.content'
import { ACENTO, PALETA } from './xv-fantasia.palette'

/** «Noche Estrellada» — Alicia. */
export const xv_fantasiaDefinition: ThemeDefinition = {
  key: 'xv-fantasia',
  label: 'Noche Estrellada',
  categorySlug: 'xv-anos',
  palette: PALETA,
  fonts: ['greatVibes', 'italiana', 'cinzel', 'dmSans', 'cormorant', 'jetbrainsMono'],
  pinta: { fotos: { casillas: 0 }, sinCampos: { hero: ['nameB'], itinerary: ['note'] } },
  sections: ['hero', 'quote', 'hosts', 'schedule', 'reception', 'map', 'itinerary', 'music', 'dressCode', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  estilo: { acento: ACENTO, caligrafia: 'greatVibes', titulares: 'italiana' },
  Component: dynamic(() => import('./xv-fantasia.view').then((modulo) => modulo.XvFantasiaView)),
}
