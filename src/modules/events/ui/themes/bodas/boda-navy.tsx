import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './boda-navy.content'
import { ACENTO, PALETA } from './boda-navy.palette'

/**
 * «Noche Estrellada» — Maya & Anderson, de `wedding-variants-7.jsx`.
 *
 * La Editorial de medianoche: purpurina dorada sobre azul marino en toda la invitación,
 * cuenta atrás con aros, tarjetas con marco de oro y el itinerario como esfera de reloj.
 */
export const bodaNavyDefinition: ThemeDefinition = {
  key: 'boda-navy',
  label: 'Cielo estrellado',
  categorySlug: 'boda',
  palette: PALETA,
  fonts: ['spectral', 'jetbrainsMono', 'greatVibes', 'playfairDisplay', 'montserrat', 'cinzel', 'cormorant'],
  rsvp: 'pildoras',
  pinta: {
    // Seis en el carrusel y el retrato grande de arriba.
    fotos: { casillas: 6, retrato: true },
    sinCampos: {
      ceremony: ['address'],
      reception: ['address'],
      map: ['label'],
      itinerary: ['note', 'imageId'],
      dressCode: ['detail'],
      gallery: ['label'],
    },
    maxAvisos: 3,
  },
  sections: ['hero', 'quote', 'schedule', 'notes', 'hosts', 'ceremony', 'reception', 'map', 'itinerary', 'gallery', 'dressCode', 'music', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  estilo: { acento: ACENTO, caligrafia: 'greatVibes', titulares: 'playfairDisplay' },
  Component: dynamic(() => import('./boda-navy.view').then((modulo) => modulo.BodaNavyView)),
}
