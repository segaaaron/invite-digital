import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './cumple-femme.content'
import { ACENTO, PALETA } from './cumple-femme.palette'

/**
 * «Femme Fatale» — fiesta de disfraces entre amigas. Telón granate, oro viejo y cabaret.
 *
 * El segundo cumpleaños de la colección. **No se vende en la web**, como «Cervecería Vintage»:
 * solo el admin lo ve y lo asigna. La portada es un cartel de cabaret a sangre y, dentro, un
 * tocador con terciopelo de fondo.
 */
export const cumpleFemmeDefinition: ThemeDefinition = {
  key: 'cumple-femme',
  label: 'Femme Fatale',
  categorySlug: 'cumpleanos',
  palette: PALETA,
  fonts: ['cormorant', 'greatVibes', 'dmSans', 'cinzel', 'jetbrainsMono'],
  // Los dos botones de la maqueta —«¡AHÍ ESTARÉ!» y «NO PUEDO»— y el «ENVIAR RESPUESTA»
  // en vino: ni contador ni saludo, que el diseño no los dibuja.
  rsvp: 'fiesta',
  pinta: {
    // Las dos fotos en arco: las amigas disfrazadas y el brindis. Sin foto propia, las del
    // diseño.
    fotos: { casillas: 2 },
    sinCampos: {
      // El titular es el nombre de la fiesta, uno solo.
      hero: ['nameB', 'monogram', 'serial', 'portraitImageId'],
      // De la recepción, solo el lugar: la maqueta escribe una dirección y nada más, y la hora
      // sale de la fecha.
      reception: ['label', 'address', 'time'],
      // El mapa dibujado va sin rótulo: debajo se escribe la dirección.
      map: ['label'],
      dressCode: ['note', 'detail', 'colors'],
      closing: ['signature'],
    },
    maxAvisos: 4,
  },
  sections: ['hero', 'quote', 'schedule', 'gallery', 'notes', 'reception', 'dressCode', 'map', 'music', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  estilo: { acento: ACENTO, caligrafia: 'greatVibes', titulares: 'cormorant' },
  Component: dynamic(() => import('./cumple-femme.view').then((modulo) => modulo.CumpleFemmeView)),
}
