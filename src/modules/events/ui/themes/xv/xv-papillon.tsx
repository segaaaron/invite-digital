import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './xv-papillon.content'
import { PALETA } from './xv-papillon.palette'

/** «Papillon» — Emilia, de `xv-papillon.jsx` (maqueta V3). Mariposas acuarela en un jardín rosa. */
export const xvPapillonDefinition: ThemeDefinition = {
  key: 'xv-papillon',
  label: 'Papillon',
  categorySlug: 'xv-anos',
  palette: PALETA,
  fonts: ['outfit', 'cormorant', 'greatVibes', 'jetbrainsMono', 'cinzel'],
  // Los dos botones iguales de su maqueta (`uniformBg` transparente con filete de oro).
  rsvp: 'uniformes',
  pinta: {
    // El retrato va dentro del círculo de flores y mariposas.
    fotos: { casillas: 0, retrato: true },
    sinCampos: {
      hero: ['nameB', 'monogram', 'coverImageId'],
      reception: ['address'],
      itinerary: ['note'],
      dressCode: ['detail'],
    },
    maxAvisos: 1,
  },
  sections: ['hero', 'quote', 'hosts', 'schedule', 'reception', 'map', 'itinerary', 'music', 'dressCode', 'notes', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./xv-papillon.view').then((modulo) => modulo.XvPapillonView)),
}
