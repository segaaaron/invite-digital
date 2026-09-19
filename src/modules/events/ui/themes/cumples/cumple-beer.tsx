import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './cumple-beer.content'
import { PALETA } from './cumple-beer.palette'

/**
 * «Cervecería Vintage» — el cumpleaños de Miguel. Taberna de barrica, cebada y karaoke.
 *
 * **Todavía no se vende**: el catálogo lo lleva con `publicar: false`, así que nace
 * retirado del escaparate y solo el admin lo asigna a un evento desde el panel.
 *
 * Es el primer diseño que no es ni boda ni XV, y por eso no pide anfitriones, ceremonia,
 * itinerario, galería ni código de vestimenta: no pinta ninguno.
 */
export const cumpleBeerDefinition: ThemeDefinition = {
  key: 'cumple-beer',
  label: 'Cervecería Vintage',
  categorySlug: 'cumpleanos',
  palette: PALETA,
  fonts: ['dmSans', 'jetbrainsMono', 'greatVibes', 'cinzel', 'cormorant'],
  // Dos botones y el contador de invitados, como las bodas: en un cumpleaños se contesta
  // «voy» o «no voy», y el libro de firmas es «Déjame un Mensaje», que el diseño sí pinta.
  rsvp: 'botones',
  pinta: {
    fotos: { portada: true, casillas: 0 },
    sinCampos: {
      // El monograma y la línea bajo los nombres no se pintan: la portada es una imagen y
      // el segundo nombre no existe —cumple una persona—.
      hero: ['nameB', 'monogram', 'serial', 'portraitImageId'],
    },
    // Los dos avisos del diseño: la frase de bienvenida y el karaoke. Un tercero no tendría
    // dónde pintarse.
    maxAvisos: 2,
  },
  sections: ['hero', 'schedule', 'notes', 'reception', 'map', 'music', 'quote', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./cumple-beer.view').then((modulo) => modulo.CumpleBeerView)),
}
