import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './boda-ed.content'
import { PALETA } from './boda-ed.palette'

/** «Editorial» — María & Alex (maqueta V3). Verde botánico y oro, con el retrato enmarcado sobre las hojas. */
export const bodaEdDefinition: ThemeDefinition = {
  key: 'boda-ed',
  label: 'Editorial',
  categorySlug: 'boda',
  palette: PALETA,
  fonts: ['spectral', 'jetbrainsMono', 'greatVibes', 'montserrat', 'playfairDisplay', 'dmSans'],
  // «Asistiré» y «No puedo» como las otras editoriales (`primarySecondary`).
  rsvp: 'pildoras',
  pinta: {
    fotos: { casillas: 2 },
    // Las tarjetas pintan rótulo, hora y lugar, sin dirección; el itinerario, hora y momento.
    sinCampos: { itinerary: ['note', 'imageId'], ceremony: ['address'], reception: ['address'], notes: ['title'], map: ['label'] },
    maxAvisos: 4,
  },
  sections: ['hero', 'quote', 'hosts', 'schedule', 'ceremony', 'reception', 'map', 'itinerary', 'dressCode', 'gallery', 'notes', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./boda-ed.view').then((modulo) => modulo.BodaEdView)),
}
