import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './xv-luciana.content'
import { PALETA } from './xv-luciana.palette'

/** «Bosque Encantado» — Luciana. */
export const xv_lucianaDefinition: ThemeDefinition = {
  key: 'xv-luciana',
  label: 'Bosque Encantado',
  categorySlug: 'xv-anos',
  palette: PALETA,
  fonts: ['greatVibes', 'italiana', 'cinzel', 'dmSans', 'cormorant', 'jetbrainsMono'],
  sections: ['hero', 'quote', 'hosts', 'schedule', 'reception', 'map', 'itinerary', 'music', 'dressCode', 'notes', 'gallery', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./xv-luciana.view').then((modulo) => modulo.XvLucianaView)),
}
