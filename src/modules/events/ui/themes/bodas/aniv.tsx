import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './aniv.content'
import { PALETA } from './aniv.palette'

/** «Bodas de Oro» — el aniversario, con su sol de rayos y su tira de décadas. */
export const anivDefinition: ThemeDefinition = {
  key: 'aniv',
  label: 'Bodas de Oro',
  categorySlug: 'boda',
  palette: PALETA,
  fonts: ['cormorant', 'jetbrainsMono', 'cinzel'],
  rsvp: 'botones',
  pinta: {
    fotos: { casillas: 5 },
    // «Bodas de Oro» pone el rótulo de los anfitriones sobre los nombres de la pareja y no
    // llega a enseñar los suyos; su recepción va sin hora y su aviso, sin encabezado.
    sinCampos: { hosts: ['names'], reception: ['time'], notes: ['title'] },
    maxAvisos: 1,
  },
  sections: ['hero', 'hosts', 'quote', 'schedule', 'reception', 'map', 'music', 'gallery', 'notes', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./aniv.view').then((modulo) => modulo.AnivView)),
}
