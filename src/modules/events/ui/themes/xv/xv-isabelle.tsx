import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './xv-isabelle.content'
import { ACENTO, PALETA } from './xv-isabelle.palette'

/** «Palacio Griego» — Isabelle (maqueta V3). Mármol crema, oro viejo y la quinceañera entre columnas. */
export const xvIsabelleDefinition: ThemeDefinition = {
  key: 'xv-isabelle',
  label: 'Palacio Griego',
  categorySlug: 'xv-anos',
  palette: PALETA,
  fonts: ['greatVibes', 'italiana', 'cinzel', 'dmSans', 'cormorant', 'jetbrainsMono'],
  pinta: {
    // Su retrato es la foto que abre la invitación a sangre, entre columnas (la portada no se toca).
    fotos: { retrato: true, casillas: 0 },
    sinCampos: { hero: ['nameB'], itinerary: ['note'] },
  },
  sections: ['hero', 'quote', 'hosts', 'schedule', 'reception', 'map', 'itinerary', 'music', 'dressCode', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  estilo: { acento: ACENTO, caligrafia: 'greatVibes', titulares: 'italiana' },
  Component: dynamic(() => import('./xv-isabelle.view').then((modulo) => modulo.XvIsabelleView)),
}
