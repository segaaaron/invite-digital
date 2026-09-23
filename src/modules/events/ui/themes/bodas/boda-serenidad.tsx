import dynamic from 'next/dynamic'
import type { ThemeDefinition } from '../contract'
import { CONTENIDO_DE_MUESTRA } from './boda-serenidad.content'
import { PALETA } from './boda-serenidad.palette'

/**
 * «Jardín de Serenidad» — Sofía & Daniel, de `wedding-variants-5.jsx`.
 *
 * Editorial de revista en azules de tinta china sobre cielo empolvado: portada con la caída
 * de flores y sus motas de oro, cabecera de revista, capitular en la historia, carrusel de
 * fotografías y cenefa floral entre bloques.
 */
export const bodaSerenidadDefinition: ThemeDefinition = {
  key: 'boda-serenidad',
  label: 'Jardín de Serenidad',
  categorySlug: 'boda',
  palette: PALETA,
  fonts: ['spectral', 'jetbrainsMono', 'greatVibes', 'cormorant', 'playfairDisplay'],
  rsvp: 'pildoras',
  pinta: {
    // Seis en el carrusel y el retrato grande de arriba.
    fotos: { casillas: 6, retrato: true },
    sinCampos: {
      // La portada es la fotografía del diseño con el rótulo de la revista encima.
      hero: ['monogram', 'serial', 'coverImageId'],
      ceremony: ['address'],
      reception: ['address'],
      map: ['label'],
      itinerary: ['note', 'imageId'],
      dressCode: ['detail'],
      gallery: ['label'],
    },
    maxAvisos: 3,
  },
  sections: ['hero', 'quote', 'schedule', 'hosts', 'ceremony', 'reception', 'map', 'itinerary', 'gallery', 'dressCode', 'notes', 'music', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./boda-serenidad.view').then((modulo) => modulo.BodaSerenidadView)),
}
