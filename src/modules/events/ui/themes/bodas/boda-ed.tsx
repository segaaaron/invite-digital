import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './boda-ed.content'
import { PALETA } from './boda-ed.palette'

/** «Editorial» — María & Alex. Verde botánico y oro, con el retrato enmarcado sobre las hojas. */
export const bodaEdDefinition: ThemeDefinition = {
  key: 'boda-ed',
  label: 'Editorial',
  categorySlug: 'boda',
  palette: PALETA,
  fonts: ['spectral', 'jetbrainsMono', 'greatVibes'],
  sections: ['hero', 'quote', 'hosts', 'schedule', 'ceremony', 'reception', 'map', 'itinerary', 'dressCode', 'gallery', 'notes', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./boda-ed.view').then((modulo) => modulo.BodaEdView)),
}
