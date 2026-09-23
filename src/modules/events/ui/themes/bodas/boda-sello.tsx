import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './boda-sello.content'
import { PALETA } from './boda-sello.palette'

/**
 * «Sobre Lacrado» — Camila & Sebastián, de `boda-sobre-lacrado.jsx`.
 *
 * Acuarela crema y guinda: bloques claros con esquinas de flores pintadas que flotan y
 * bloques ciruela para la cuenta atrás, los lugares y el cierre. Los números grandes en
 * Bodoni Moda cursiva, los nombres en caligrafía y los rótulos en Cormorant con mucho
 * interletrado.
 */
export const bodaSelloDefinition: ThemeDefinition = {
  key: 'boda-sello',
  label: 'Sobre Lacrado',
  categorySlug: 'boda',
  palette: PALETA,
  fonts: ['cormorant', 'greatVibes', 'bodoniModa', 'jetbrainsMono'],
  rsvp: 'uniformes',
  pinta: {
    // Este diseño no tiene galería: sus fotografías son las del arte, a sangre. Lo que sí
    // pide es el retrato de la pareja... que también es del diseño, así que ninguna casilla.
    fotos: { casillas: 0 },
    sinCampos: {
      // La portada es el sobre: ni fotografía, ni iniciales, ni línea bajo los nombres.
      hero: ['monogram', 'serial', 'coverImageId', 'portraitImageId'],
      // Cada lugar lleva su nombre, su hora y su rótulo; la dirección va en el mapa.
      ceremony: ['address'],
      reception: ['address'],
      map: ['label'],
      itinerary: ['note', 'imageId'],
      // El código de vestimenta es el rótulo, el titular y la nota: no hay paleta de colores.
      dressCode: ['detail', 'colors'],
    },
    // Tres avisos, y cada uno tiene su sitio: la historia, «solo para adultos» y los regalos.
    maxAvisos: 3,
  },
  sections: ['hero', 'quote', 'schedule', 'hosts', 'ceremony', 'reception', 'map', 'itinerary', 'dressCode', 'notes', 'music', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./boda-sello.view').then((modulo) => modulo.BodaSelloView)),
}
