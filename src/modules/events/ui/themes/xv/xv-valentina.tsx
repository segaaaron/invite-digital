import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './xv-valentina.content'
import { PALETA } from './xv-valentina.palette'

/** «Mascarada» — Valentina. */
export const xv_valentinaDefinition: ThemeDefinition = {
  key: 'xv-valentina',
  label: 'Mascarada',
  categorySlug: 'xv-anos',
  palette: PALETA,
  fonts: ['greatVibes', 'italiana', 'cinzel', 'dmSans', 'cormorant', 'jetbrainsMono'],
  pinta: { fotos: { portada: true, casillas: 1 }, sinCampos: { hero: ['nameB'], itinerary: ['note'] } },
  sections: ['hero', 'quote', 'hosts', 'schedule', 'reception', 'map', 'itinerary', 'music', 'dressCode', 'notes', 'gallery', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./xv-valentina.view').then((modulo) => modulo.XvValentinaView)),
}
