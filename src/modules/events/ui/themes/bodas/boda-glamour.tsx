import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './boda-glamour.content'
import { PALETA } from './boda-glamour.palette'

/**
 * «Glamour» — Valeria & Nicolas, de `wedding-variants.jsx` (`WeddingBotanical`).
 *
 * Guinda y oro: el retrato recortado en su marco de flores, filetes de oro con su ❋, ramos
 * que flotan, la fecha a lo grande, el itinerario de iconos y pétalos guinda cayendo.
 */
export const bodaGlamourDefinition: ThemeDefinition = {
  key: 'boda-glamour',
  label: 'Glamour',
  categorySlug: 'boda',
  palette: PALETA,
  fonts: ['cormorant', 'greatVibes', 'montserrat', 'playfairDisplay', 'dmSans', 'jetbrainsMono'],
  rsvp: 'pildoras',
  pinta: {
    // Cinco en el carrusel «Nuestra Historia» y el retrato de arriba.
    fotos: { casillas: 5, retrato: true },
    sinCampos: {
      // Sin monograma, ni número de edición, ni portada propia: la portada es el marco del diseño.
      hero: ['monogram', 'serial', 'coverImageId'],
      ceremony: ['address'],
      reception: ['address'],
      map: ['label'],
      itinerary: ['note', 'imageId'],
      // Solo el dibujo de la vestimenta y la frase: la maqueta no pinta paleta de colores.
      dressCode: ['detail', 'colors'],
      gallery: ['label'],
      // Los avisos van sin título: la historia sigue a la frase, y «solo adultos» y la mesa de
      // regalos llevan su rótulo fijo.
      notes: ['title'],
    },
    maxAvisos: 3,
  },
  sections: ['hero', 'quote', 'schedule', 'hosts', 'ceremony', 'reception', 'map', 'itinerary', 'gallery', 'dressCode', 'notes', 'music', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./boda-glamour.view').then((modulo) => modulo.BodaGlamourView)),
}
