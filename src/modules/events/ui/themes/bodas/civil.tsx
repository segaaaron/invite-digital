import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './civil.content'
import { PALETA } from './civil.palette'

/** «Civil» — Lucía & Andrés. La unión civil leída como un acta. */
export const civilDefinition: ThemeDefinition = {
  key: 'civil',
  label: 'Civil',
  categorySlug: 'boda-civil',
  palette: PALETA,
  fonts: ['spectral', 'jetbrainsMono', 'cormorant', 'cinzel'],
  rsvp: 'botones',
  sections: ['hero', 'hosts', 'schedule', 'ceremony', 'reception', 'map', 'gallery', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./civil.view').then((modulo) => modulo.CivilView)),
}
