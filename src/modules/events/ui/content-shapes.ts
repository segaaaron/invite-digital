/**
 * Qué campos tiene cada bloque del contenido de la invitación, y de qué clase es cada uno.
 *
 * Es lo que el panel necesita para pintar un formulario de verdad en vez de un textarea
 * con JSON dentro: el dominio dice qué es válido, y esto dice cómo se pregunta.
 *
 * **Las claves van tipadas contra el dominio.** `campos<HeroBlock>(…)` no compila si
 * alguien renombra `portraitImageId` y se olvida de esta lista; sin eso, el editor
 * seguiría preguntando por un campo que ya no existe y el dominio lo descartaría al
 * guardar, sin un solo error.
 *
 * Módulo puro: sin React, sin acciones, sin nada de `infrastructure`.
 */

import {
  type GalleryRow,
  type HeroBlock,
  type InvitationContent,
  type ItineraryRow,
  MAXIMOS,
  type NoteCard,
  type PlaceBlock,
  type SectionKey,
} from '../domain/invitation-content'

/**
 * Cómo se pregunta un campo.
 *
 * `icono` no es `imagen` **a propósito**: en el itinerario, `imageId` es la clave del
 * dibujo que trae el diseño —`church`, `flutes`, `cake`—, no una fotografía del evento.
 * Ofrecer ahí las fotos de la boda pondría el retrato de la novia donde va la campana.
 */
export type ClaseDeCampo = 'texto' | 'parrafo' | 'fecha' | 'imagen' | 'icono' | 'audio'

export type Campo = {
  readonly key: string
  readonly label: string
  readonly kind: ClaseDeCampo
  /** Una fila de lista sin sus campos obligatorios la descarta el dominio al guardar. */
  readonly required?: boolean
  readonly hint?: string
}

/** Una lista de valores sueltos dentro de un bloque: los anfitriones, las telas del código. */
export type ListaSuelta = {
  readonly key: string
  readonly label: string
  readonly itemLabel: string
  readonly kind: 'texto' | 'imagen'
  readonly max: number
}

export type FormaBloque =
  | { readonly form: 'campos'; readonly fields: readonly Campo[]; readonly list?: ListaSuelta }
  | { readonly form: 'filas'; readonly itemLabel: string; readonly max: number; readonly fields: readonly Campo[] }

/** Ata las claves declaradas a las del bloque del dominio. Su único trabajo es no compilar. */
const campos = <T,>(...lista: readonly (Campo & { readonly key: Extract<keyof T, string> })[]): readonly Campo[] =>
  lista

const lugar = (): readonly Campo[] =>
  campos<PlaceBlock>(
    { key: 'label', label: 'Rótulo', kind: 'texto', hint: 'Lo que el diseño pone encima: «CEREMONIA».' },
    { key: 'place', label: 'Lugar', kind: 'texto' },
    { key: 'address', label: 'Dirección', kind: 'texto' },
    { key: 'time', label: 'Hora', kind: 'texto', hint: 'Tal cual se lee: «16:00 h».' },
  )

export const FORMAS: Record<SectionKey, FormaBloque> = {
  hero: {
    form: 'campos',
    fields: campos<HeroBlock>(
      { key: 'eyebrow', label: 'Antetítulo', kind: 'texto', hint: 'La línea de arriba: «¡NOS CASAMOS!».' },
      { key: 'nameA', label: 'Primer nombre', kind: 'texto' },
      { key: 'nameB', label: 'Segundo nombre', kind: 'texto' },
      { key: 'monogram', label: 'Monograma', kind: 'texto', hint: '«M & R».' },
      { key: 'serial', label: 'Línea suelta', kind: 'texto', hint: 'La referencia pequeña que algunos diseños pintan bajo los nombres.' },
      { key: 'coverImageId', label: 'Fotografía de portada', kind: 'imagen' },
      { key: 'portraitImageId', label: 'Retrato', kind: 'imagen' },
    ),
  },
  quote: {
    form: 'campos',
    fields: campos<NonNullable<InvitationContent['quote']>>({ key: 'text', label: 'Frase', kind: 'parrafo' }),
  },
  hosts: {
    form: 'campos',
    fields: campos<NonNullable<InvitationContent['hosts']>>({
      key: 'label',
      label: 'Rótulo',
      kind: 'texto',
      hint: '«CON LA BENDICIÓN DE NUESTROS PADRES».',
    }),
    list: { key: 'names', label: 'Nombres', itemLabel: 'nombre', kind: 'texto', max: MAXIMOS.hosts },
  },
  schedule: {
    form: 'campos',
    fields: campos<NonNullable<InvitationContent['schedule']>>({
      key: 'startsAt',
      label: 'Fecha y hora exactas',
      kind: 'fecha',
      hint: 'Es lo que usa la cuenta atrás. La fecha del evento sigue siendo la de Detalles.',
    }),
  },
  ceremony: { form: 'campos', fields: lugar() },
  reception: { form: 'campos', fields: lugar() },
  map: {
    form: 'campos',
    fields: campos<NonNullable<InvitationContent['map']>>(
      { key: 'label', label: 'Rótulo', kind: 'texto' },
      { key: 'coords', label: 'Coordenadas', kind: 'texto', hint: '«19.32°N · 99.18°W».' },
      { key: 'href', label: 'Enlace al mapa', kind: 'texto' },
    ),
  },
  itinerary: {
    form: 'filas',
    itemLabel: 'momento',
    max: MAXIMOS.itinerary,
    fields: campos<ItineraryRow>(
      { key: 'time', label: 'Hora', kind: 'texto', required: true },
      { key: 'label', label: 'Qué pasa', kind: 'texto', required: true },
      { key: 'note', label: 'Detalle', kind: 'texto' },
      { key: 'imageId', label: 'Icono', kind: 'icono' },
    ),
  },
  dressCode: {
    form: 'campos',
    fields: campos<NonNullable<InvitationContent['dressCode']>>(
      { key: 'title', label: 'Título', kind: 'texto', hint: '«Formal».' },
      { key: 'note', label: 'Rótulo', kind: 'texto', hint: '«CÓDIGO DE VESTIMENTA».' },
      { key: 'detail', label: 'Detalle', kind: 'parrafo' },
    ),
    list: { key: 'imageIds', label: 'Fotografías', itemLabel: 'fotografía', kind: 'imagen', max: 4 },
  },
  music: {
    form: 'campos',
    fields: campos<NonNullable<InvitationContent['music']>>(
      { key: 'track', label: 'Canción', kind: 'texto' },
      { key: 'artist', label: 'Artista', kind: 'texto' },
      {
        key: 'audioMediaId',
        label: 'Archivo que suena',
        kind: 'audio',
        hint: 'El MP3 que subiste arriba. Sin él, el reproductor se ve pero no suena — que es como están los dieciséis diseños.',
      },
    ),
  },
  gallery: {
    form: 'filas',
    itemLabel: 'casilla',
    max: MAXIMOS.gallery,
    fields: campos<GalleryRow>(
      { key: 'label', label: 'Rótulo', kind: 'texto', required: true },
      { key: 'imageId', label: 'Fotografía', kind: 'imagen' },
    ),
  },
  notes: {
    form: 'filas',
    itemLabel: 'aviso',
    max: MAXIMOS.notes,
    fields: campos<NoteCard>(
      { key: 'title', label: 'Título', kind: 'texto', required: true },
      { key: 'text', label: 'Texto', kind: 'parrafo' },
    ),
  },
  closing: {
    form: 'campos',
    fields: campos<NonNullable<InvitationContent['closing']>>(
      { key: 'text', label: 'Despedida', kind: 'parrafo' },
      { key: 'signature', label: 'Firma', kind: 'texto' },
      { key: 'imageId', label: 'Fotografía', kind: 'imagen' },
    ),
  },
}
