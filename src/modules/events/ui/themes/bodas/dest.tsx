import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './dest.content'
import { PALETA } from './dest.palette'

/** «Destino» — Alejandra & Pablo. La boda de playa, con su itinerario de cuatro días. */
export const destDefinition: ThemeDefinition = {
  key: 'dest',
  label: 'Destino',
  categorySlug: 'boda',
  palette: PALETA,
  fonts: ['cormorant', 'jetbrainsMono', 'spaceGrotesk'],
  rsvp: 'botones',
  pinta: { fotos: { casillas: 6 }, sinCampos: { reception: ['time'], dressCode: ['note'], itinerary: ['note', 'imageId'] } },
  sections: ['hero', 'quote', 'schedule', 'reception', 'itinerary', 'dressCode', 'gallery', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./dest.view').then((modulo) => modulo.DestView)),
}
