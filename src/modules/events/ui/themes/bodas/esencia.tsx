import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './esencia.content'
import { PALETA } from './esencia.palette'

/**
 * «Esencia» — Valentina & Mateo, de `esencia.jsx`.
 *
 * Minimalista cálido: lino, tinta parda, oro viejo y ramas de olivo a línea. La portada es
 * el retrato redondo con su aro dorado sobre el lino, y el cuerpo, una columna de bloques
 * centrados con su rótulo en versales y su filete de rombo.
 */
export const esenciaDefinition: ThemeDefinition = {
  key: 'esencia',
  label: 'Esencia',
  categorySlug: 'boda',
  palette: PALETA,
  // JetBrains Mono no es del diseño: la pinta el reproductor de música del kit, que este
  // diseño usa. Declararla es lo que impide que salga con la fuente de respaldo.
  fonts: ['outfit', 'cormorant', 'jetbrainsMono'],
  rsvp: 'linea',
  pinta: {
    // Cinco de la galería y el retrato redondo de la portada. El lino del fondo es arte del
    // diseño, no una casilla: la maqueta no ofrece cambiarlo.
    fotos: { casillas: 5, retrato: true },
    sinCampos: {
      // La portada no pinta ni la línea bajo los nombres ni una fotografía a sangre: lo que
      // enseña es el retrato redondo.
      hero: ['serial', 'coverImageId'],
      // El itinerario del diseño es hora y qué pasa; el icono lo pone él, por el orden.
      itinerary: ['note', 'imageId'],
      // El mapa se abre desde los botones de cada lugar: no hay bloque de plano, así que
      // el nombre sobre el plano no se pide.
      map: ['label'],
      // El código de vestimenta de la maqueta es título, colores y una nota; no hay
      // párrafo largo. Y las fotografías van sin pie.
      dressCode: ['detail'],
      gallery: ['label'],
    },
  },
  sections: ['hero', 'quote', 'schedule', 'ceremony', 'reception', 'map', 'itinerary', 'dressCode', 'gallery', 'music', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./esencia.view').then((modulo) => modulo.EsenciaView)),
}
