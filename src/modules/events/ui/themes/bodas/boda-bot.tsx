import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './boda-bot.content'
import { ACENTO, PALETA } from './boda-bot.palette'

/** «Botánica» — Marcia & Ricardo. Acuarelas florales, verde salvia y caligrafía. */
export const bodaBotDefinition: ThemeDefinition = {
  key: 'boda-bot',
  label: 'Botánica',
  categorySlug: 'boda',
  palette: PALETA,
  fonts: ['greatVibes', 'cormorant', 'jetbrainsMono', 'cinzel'],
  rsvp: 'botones',
  pinta: {
    fotos: { casillas: 5 },
    sinCampos: { hero: ['monogram', 'serial'], itinerary: ['note'] },
    maxAvisos: 3,
  },
  sections: ['hero', 'gallery', 'quote', 'schedule', 'ceremony', 'reception', 'itinerary', 'map', 'dressCode', 'music', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  estilo: { acento: ACENTO, caligrafia: 'greatVibes' },
  Component: dynamic(() => import('./boda-bot.view').then((modulo) => modulo.BodaBotView)),
}
