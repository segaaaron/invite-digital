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
  // Dos botones y el contador de invitados, como las bodas, pero con el «sí» ya en el oro
  // del diseño y sin el saludo encima: es lo que dibuja su maqueta. El libro de firmas es
  // «Déjame un Mensaje», que este diseño sí pinta.
  rsvp: 'botones-oro',
  pinta: {
    // **Ninguna fotografía.** La portada es el arte del diseño, a sangre y con su texto
    // dentro, y no hay galería ni retrato: no existe un solo hueco donde poner una foto.
    fotos: { casillas: 0 },

    // Los dos avisos del diseño: la frase de bienvenida y el karaoke. Un tercero no tendría
    // dónde pintarse.
    maxAvisos: 2,
  },
  // **Sin bloque de portada.** No es un olvido: la portada de este diseño es la
  // ilustración, con los nombres y la frase rotulados dentro, y no pinta ni una palabra de
  // lo que se escribiría ahí. El título con el que viaja el enlace al compartirlo sale
  // entonces del nombre del evento, que ya escribe quien lo da de alta.
  sections: ['schedule', 'notes', 'reception', 'map', 'music', 'quote', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./cumple-beer.view').then((modulo) => modulo.CumpleBeerView)),
}
