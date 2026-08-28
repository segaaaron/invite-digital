import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './boda-ed.content'
import { PALETA } from './boda-ed.palette'

/** «Editorial» — María & Alex. La boda compuesta como un número de revista. */
export const bodaEdDefinition: ThemeDefinition = {
  key: 'boda-ed',
  label: 'Editorial',
  categorySlug: 'boda',
  palette: PALETA,
  fonts: ['spectral', 'jetbrainsMono'],
  sections: ['hero', 'quote', 'schedule', 'reception', 'map', 'itinerary', 'dressCode', 'gallery', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./boda-ed.view').then((modulo) => modulo.BodaEdView)),
}
