import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './boda-royal.content'
import { PALETA } from './boda-royal.palette'

/**
 * «Royal Blush» — Renata & Pablo, de `wedding-variants-6.jsx`.
 *
 * La hermana en rosa palo y borgoña de la familia Editorial: la fotografía del palacio de
 * fondo en toda la invitación, filetes de oro entre bloques y el itinerario en rejilla de
 * tres columnas con un medallón por hito.
 */
export const bodaRoyalDefinition: ThemeDefinition = {
  key: 'boda-royal',
  label: 'Royal Blush',
  categorySlug: 'boda',
  palette: PALETA,
  fonts: ['spectral', 'jetbrainsMono', 'greatVibes', 'cormorant', 'playfairDisplay'],
  rsvp: 'botones',
  pinta: {
    fotos: { casillas: 5, retrato: true },
    sinCampos: {
      hero: ['monogram', 'coverImageId'],
      ceremony: ['address'],
      reception: ['address'],
      map: ['label'],
      itinerary: ['note', 'imageId'],
      dressCode: ['detail'],
      gallery: ['label'],
    },
    maxAvisos: 3,
  },
  sections: ['hero', 'quote', 'schedule', 'hosts', 'ceremony', 'reception', 'map', 'itinerary', 'gallery', 'dressCode', 'notes', 'music', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./boda-royal.view').then((modulo) => modulo.BodaRoyalView)),
}
