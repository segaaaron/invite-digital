import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './eng.content'
import { PALETA } from './eng.palette'

/** «Compromiso» — la pedida de mano, con el anillo girando alrededor del retrato. */
export const engDefinition: ThemeDefinition = {
  key: 'eng',
  label: 'Compromiso',
  categorySlug: 'boda',
  palette: PALETA,
  fonts: ['newsreader', 'jetbrainsMono', 'cormorant', 'cinzel'],
  rsvp: 'botones',
  pinta: { fotos: { casillas: 5 }, sinCampos: { hero: ['monogram', 'serial'], reception: ['time'] } },
  sections: ['hero', 'hosts', 'quote', 'schedule', 'reception', 'map', 'music', 'gallery', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./eng.view').then((modulo) => modulo.EngView)),
}
