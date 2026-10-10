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
  fonts: ['greatVibes', 'cormorant', 'spectral', 'montserrat', 'playfairDisplay', 'jetbrainsMono', 'cinzel'],
  // `RSVP primarySecondary` de la maqueta: píldoras, el «sí» relleno de salida y el «no» con filete.
  rsvp: 'pildoras',
  pinta: {
    fotos: { casillas: 5 },
    // Las tarjetas de ceremonia y recepción no llevan dirección (PDF 9 oct: fuera el bloque «· LUGAR ·»), y
    // cada plano lleva el nombre de su lugar, no un rótulo aparte (V5).
    sinCampos: { hero: ['monogram', 'serial'], itinerary: ['note'], ceremony: ['address'], reception: ['address'], map: ['label'] },
    maxAvisos: 3,
  },
  sections: ['hero', 'gallery', 'quote', 'schedule', 'ceremony', 'reception', 'map', 'itinerary', 'dressCode', 'music', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  estilo: { acento: ACENTO, caligrafia: 'greatVibes' },
  Component: dynamic(() => import('./boda-bot.view').then((modulo) => modulo.BodaBotView)),
}
