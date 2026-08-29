import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './xv-isabelle.content'
import { PALETA } from './xv-isabelle.palette'

/** «Palacio Griego» — Isabelle. Mármol, oro viejo y acuarela blanca. */
export const xvIsabelleDefinition: ThemeDefinition = {
  key: 'xv-isabelle',
  label: 'Palacio Griego',
  categorySlug: 'xv-anos',
  palette: PALETA,
  fonts: ['greatVibes', 'cormorant', 'cinzel', 'marcellus', 'allura'],
  sections: ['hero', 'quote', 'hosts', 'schedule', 'ceremony', 'reception', 'map', 'itinerary', 'music', 'dressCode', 'gallery', 'notes', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./xv-isabelle.view').then((modulo) => modulo.XvIsabelleView)),
}
