import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './esencia.content'
import { ACENTO, PALETA } from './esencia.palette'

/**
 * «Esencia» — Valentina & Mateo, de `esencia.jsx`.
 *
 * Minimalista cálido: lino, tinta parda, oro viejo y ramas de olivo a línea. Desde la maqueta
 * V4 se abre con un sobre lacrado; el retrato redondo con su aro dorado es el primer bloque, y el
 * cuerpo, una columna de bloques centrados con su rótulo en versales y su filete de rombo.
 */
export const esenciaDefinition: ThemeDefinition = {
  key: 'esencia',
  label: 'Esencia',
  categorySlug: 'boda',
  palette: PALETA,
  // JetBrains Mono no la pinta el diseño: la nombra la piel de las ranuras (`slot-skin`), que
  // la vista sobrescribe con Outfit. Se declara para que la prueba de tipografías no falle.
  fonts: ['outfit', 'cormorant', 'jetbrainsMono'],
  // V4: «Asistiré» en oro macizo y «No puedo» hueco, en Outfit (`--font-mono` de la vista).
  rsvp: 'pildoras',
  pinta: {
    // Cinco de la galería y el retrato redondo de la portada. El lino del fondo es arte del
    // diseño, no una casilla: la maqueta no ofrece cambiarlo.
    fotos: { casillas: 5, retrato: true },
    sinCampos: {
      // La portada no pinta ni la línea bajo los nombres ni una fotografía a sangre: lo que
      // enseña es el retrato redondo.
      hero: ['serial'],
      // V4 dejó de pintar la dirección bajo cada lugar: el botón la busca por el nombre.
      ceremony: ['address'],
      reception: ['address'],
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
  // En el orden en que los pinta (V4). Los avisos: el primero es «solo adultos» y los demás,
  // los hitos de «Nuestra historia», con el año de título.
  sections: ['hero', 'quote', 'gallery', 'ceremony', 'reception', 'map', 'hosts', 'itinerary', 'schedule', 'dressCode', 'notes', 'music', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  estilo: { acento: ACENTO, titulares: 'cormorant' },
  Component: dynamic(() => import('./esencia.view').then((modulo) => modulo.EsenciaView)),
}
