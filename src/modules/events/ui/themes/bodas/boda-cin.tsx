import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './boda-cin.content'
import { PALETA } from './boda-cin.palette'

/** «Cinemática» — Sofía & Diego. La boda leída como un estreno de cine. */
export const bodaCinDefinition: ThemeDefinition = {
  key: 'boda-cin',
  label: 'Cinemática',
  categorySlug: 'boda',
  palette: PALETA,
  // Great Vibes entra con la portada: los nombres van en caligrafía sobre el arte, como en
  // la maqueta.
  fonts: ['italiana', 'cormorant', 'jetbrainsMono', 'cinzel', 'greatVibes'],
  rsvp: 'botones',
  pinta: { fotos: { casillas: 3 }, sinCampos: { itinerary: ['imageId'] } },
  sections: ['hero', 'quote', 'hosts', 'schedule', 'reception', 'map', 'itinerary', 'music', 'dressCode', 'gallery', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./boda-cin.view').then((modulo) => modulo.BodaCinView)),
}
