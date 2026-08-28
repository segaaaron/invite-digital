import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './boda-bot.content'
import { PALETA } from './boda-bot.palette'

/** «Botánica» — Marcia & Ricardo. Acuarelas florales, verde salvia y caligrafía. */
export const bodaBotDefinition: ThemeDefinition = {
  key: 'boda-bot',
  label: 'Botánica',
  categorySlug: 'boda',
  palette: PALETA,
  fonts: ['greatVibes', 'cormorant'],
  sections: ['hero', 'quote', 'schedule', 'ceremony', 'reception', 'map', 'itinerary', 'music', 'dressCode', 'gallery', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./boda-bot.view').then((modulo) => modulo.BodaBotView)),
}
