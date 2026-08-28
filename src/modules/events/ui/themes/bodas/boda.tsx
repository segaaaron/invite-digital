import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './boda.content'
import { PALETA } from './boda.palette'

/**
 * «Étoile» — Camila & Mateo. Boda oscura elegante.
 *
 * La vista entra por `next/dynamic`: la definición —tipografías, secciones, paleta y
 * contenido de muestra— la leen el panel y el catálogo en el servidor, y no tienen por qué
 * arrastrar el diseño entero al paquete para saber cómo se llama.
 */
export const bodaDefinition: ThemeDefinition = {
  key: 'boda',
  label: 'Étoile',
  categorySlug: 'boda',
  palette: PALETA,
  fonts: ['cormorant', 'spaceGrotesk', 'jetbrainsMono'],
  sections: ['hero', 'schedule', 'ceremony', 'reception', 'map', 'itinerary', 'music', 'dressCode', 'gallery', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./boda.view').then((modulo) => modulo.BodaView)),
}
