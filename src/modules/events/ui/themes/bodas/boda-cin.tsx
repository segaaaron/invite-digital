import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './boda-cin.content'
import { PALETA } from './boda-cin.palette'

/** «Cinemática» — Sofía & Diego (maqueta V3). El póster de cine abre a un programa de gala negro y oro. */
export const bodaCinDefinition: ThemeDefinition = {
  key: 'boda-cin',
  label: 'Cinemática',
  categorySlug: 'boda',
  palette: PALETA,
  fonts: ['spectral', 'cormorant', 'jetbrainsMono', 'greatVibes'],
  // «Asistiré» y «No puedo» como las editoriales (`primarySecondary`).
  rsvp: 'pildoras',
  pinta: {
    // El retrato de la portada y las cuatro fotos del carrusel «Nosotros».
    fotos: { casillas: 5 },
    // Las tarjetas pintan rótulo, hora y lugar; el itinerario, hora, momento e icono. El
    // primer aviso va sin encabezado, como párrafo de invitación.
    sinCampos: { itinerary: ['note'], ceremony: ['address'], reception: ['address'], notes: ['title'], map: ['label'] },
    maxAvisos: 4,
  },
  sections: ['hero', 'quote', 'hosts', 'schedule', 'ceremony', 'reception', 'map', 'itinerary', 'music', 'dressCode', 'gallery', 'notes', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./boda-cin.view').then((modulo) => modulo.BodaCinView)),
}
