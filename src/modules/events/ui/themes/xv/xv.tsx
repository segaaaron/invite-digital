import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './xv.content'
import { ACENTO, PALETA } from './xv.palette'

/** «Bajo el Mar» — Sofía. Los XV de sirena, con burbujas y cristal esmerilado. */
export const xvDefinition: ThemeDefinition = {
  key: 'xv',
  label: 'Bajo el Mar',
  categorySlug: 'xv-anos',
  palette: PALETA,
  fonts: ['greatVibes', 'italiana', 'cinzel', 'dmSans', 'cormorant', 'jetbrainsMono'],
  pinta: { fotos: { casillas: 1 }, sinCampos: { hero: ['nameB'], itinerary: ['note'] } },
  sections: ['hero', 'quote', 'gallery', 'hosts', 'schedule', 'reception', 'map', 'itinerary', 'music', 'dressCode', 'notes', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  estilo: { acento: ACENTO, caligrafia: 'greatVibes', titulares: 'italiana' },
  Component: dynamic(() => import('./xv.view').then((modulo) => modulo.XvView)),
}
