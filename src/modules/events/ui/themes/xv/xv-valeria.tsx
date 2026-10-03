import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './xv-valeria.content'
import { ACENTO, PALETA } from './xv-valeria.palette'

/** «Gala Real» — Valeria. */
export const xv_valeriaDefinition: ThemeDefinition = {
  key: 'xv-valeria',
  label: 'Gala Real',
  categorySlug: 'xv-anos',
  palette: PALETA,
  fonts: ['greatVibes', 'italiana', 'cinzel', 'dmSans', 'cormorant', 'jetbrainsMono', 'playfairDisplay'],
  pinta: { fotos: { retrato: true, casillas: 0 }, sinCampos: { hero: ['nameB'], itinerary: ['note', 'imageId'] } },
  sections: ['hero', 'quote', 'hosts', 'schedule', 'reception', 'map', 'itinerary', 'music', 'dressCode', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  estilo: { acento: ACENTO, caligrafia: 'greatVibes', titulares: 'italiana' },
  Component: dynamic(() => import('./xv-valeria.view').then((modulo) => modulo.XvValeriaView)),
}
