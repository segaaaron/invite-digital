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
  type HostRoles,
  type InvitationContent,
  type ItineraryRow,
  MAXIMOS,
  MAX_COLORES,
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
export type ClaseDeCampo = 'texto' | 'parrafo' | 'fecha' | 'imagen' | 'icono' | 'audio' | 'ubicacion'

export type Campo = {
  readonly key: string
  readonly label: string
  readonly kind: ClaseDeCampo
  /** Una fila de lista sin sus campos obligatorios la descarta el dominio al guardar. */
  readonly required?: boolean
  readonly hint?: string
  /** Ocupa la fila entera: lo que se lee mejor largo, como el título de los anfitriones. */
  readonly anchoCompleto?: boolean
}

/** Una lista de valores sueltos dentro de un bloque: los anfitriones, las telas del código. */
export type ListaSuelta = {
  readonly key: string
  readonly label: string
  readonly itemLabel: string
  readonly kind: 'texto' | 'imagen' | 'color'
  readonly max: number
}

export type FormaBloque =
  | {
      readonly form: 'campos'
      readonly fields: readonly Campo[]
      readonly list?: ListaSuelta
      /**
       * Los anfitriones: los campos salvo el título son papeles (`roles`) y la lista son los
       * padrinos. Dice además cómo leer lo guardado antes de los papeles, que era por posición.
       */
      readonly anfitriones?: Anfitriones
    }
  | { readonly form: 'filas'; readonly itemLabel: string; readonly max: number; readonly fields: readonly Campo[] }

/**
 * Qué fotografías pinta un diseño, que es lo mismo que decir cuáles se le piden.
 *
 * **No todas las tarjetas llevan fotografía.** Hay XV cuya portada es una escena dibujada
 * —el fondo musical de «Encanto Musical»— y que no tienen ni arco de retrato ni galería:
 * ahí no hay ningún sitio donde poner una foto. Pedirla igual deja al cliente subiendo un
 * retrato que su invitación no enseña en ninguna parte, y lo descubre el día que reparte
 * el enlace. Por eso el campo de imagen sale de lo que el diseño declara, no de una lista
 * fija igual para los dieciséis.
 */
export type FotosDelDiseno = {
  /** La portada a pantalla completa: `hero.coverImageId`. */
  readonly portada?: boolean
  /** El retrato del bloque de arriba: `hero.portraitImageId`. */
  readonly retrato?: boolean
  /** Cuántas casillas de la galería pinta. Cero es un diseño sin galería. */
  readonly casillas: number
}

/**
 * Lo que un diseño pinta, que es lo mismo que decir lo que se le pide al cliente.
 *
 * Los dieciséis comparten los mismos bloques y **no pintan los mismos datos dentro de
 * ellos**: «Étoile» no escribe el monograma ni la firma de la despedida, «Bodas de Oro» no
 * enseña la hora de la recepción ni los nombres de los padres, y solo dos de los dieciséis
 * pintan el enlace del mapa. Un campo que se pide y no sale a ninguna parte es trabajo que
 * el cliente hace para nadie, y no lo descubre hasta que reparte el enlace.
 */
export type LoQuePinta = {
  readonly fotos: FotosDelDiseno
  /** Los campos que este diseño **no** pinta, por bloque. Lo que no esté aquí, se pide. */
  readonly sinCampos?: Partial<Record<SectionKey, readonly string[]>>
  /** Cuántos avisos pinta, cuando son menos que el tope del dominio. */
  readonly maxAvisos?: number
}

/** Qué anfitriones pinta la fiesta: padre y madre en un XV, los padres de cada novio en una boda. */
export type Anfitriones = 'xv' | 'boda'

/** La fiesta de un diseño, para saber qué anfitriones pedir. */
export const anfitrionesDeCategoria = (categoria: string): Anfitriones => (categoria.startsWith('xv') ? 'xv' : 'boda')

const TITULO_DE_ANFITRIONES: Campo = {
  anchoCompleto: true,
  key: 'label',
  label: 'Título',
  kind: 'texto',
  hint: 'Lo que va encima de los nombres: «CON LA BENDICIÓN DE MIS PADRES Y PADRINOS».',
}

const papeles = <K extends Exclude<keyof HostRoles, 'godparents'>>(...lista: readonly (Campo & { readonly key: K })[]): readonly Campo[] => lista

const PADRINOS: ListaSuelta = { key: 'godparents', label: 'Padrinos', itemLabel: 'padrino o madrina', kind: 'texto', max: MAXIMOS.hosts }

const ANFITRIONES: Record<Anfitriones, FormaBloque> = {
  xv: {
    form: 'campos',
    anfitriones: 'xv',
    fields: [
      TITULO_DE_ANFITRIONES,
      ...papeles({ key: 'father', label: 'Nombre del padre', kind: 'texto' }, { key: 'mother', label: 'Nombre de la madre', kind: 'texto' }),
    ],
    list: PADRINOS,
  },
  boda: {
    form: 'campos',
    anfitriones: 'boda',
    fields: [
      TITULO_DE_ANFITRIONES,
      ...papeles(
        { key: 'brideFather', label: 'Padre de la novia', kind: 'texto' },
        { key: 'brideMother', label: 'Madre de la novia', kind: 'texto' },
        { key: 'groomFather', label: 'Padre del novio', kind: 'texto' },
        { key: 'groomMother', label: 'Madre del novio', kind: 'texto' },
      ),
    ],
    list: PADRINOS,
  },
}

/** Qué declaración hace falta para que se pregunte por este campo de imagen. */
const PIDE: Record<string, (fotos: FotosDelDiseno) => boolean> = {
  coverImageId: (fotos) => fotos.portada === true,
  portraitImageId: (fotos) => fotos.retrato === true,
}

/** Cuántas filas admite esta lista en este diseño. */
const filas = (section: SectionKey, tope: number, pinta: LoQuePinta): number => {
  if (section === 'gallery') return Math.min(tope, pinta.fotos.casillas)
  if (section === 'notes' && pinta.maxAvisos !== undefined) return Math.min(tope, pinta.maxAvisos)
  return tope
}

/**
 * La forma del bloque **para este diseño**: sin los campos que no pinta y con cada lista
 * acotada a las filas que de verdad tiene.
 */
export const formaPara = (section: SectionKey, pinta: LoQuePinta, anfitriones: Anfitriones = 'boda'): FormaBloque => {
  const fuera = pinta.sinCampos?.[section] ?? []
  // Un diseño que no pinta los nombres —«Bodas de Oro»— solo pide el título.
  if (section === 'hosts') return fuera.includes('names') ? { form: 'campos', fields: [TITULO_DE_ANFITRIONES] } : ANFITRIONES[anfitriones]
  const forma = FORMAS[section]
  const fields = forma.fields.filter(
    (campo) => !fuera.includes(campo.key) && (PIDE[campo.key]?.(pinta.fotos) ?? true),
  )
  if (forma.form === 'filas') return { ...forma, fields, max: filas(section, forma.max, pinta) }
  // La lista suelta —los nombres de los anfitriones— se quita como cualquier otro campo.
  if (forma.list !== undefined && fuera.includes(forma.list.key)) {
    return { form: 'campos', fields }
  }
  return { ...forma, fields }
}

/** Ata las claves declaradas a las del bloque del dominio. Su único trabajo es no compilar. */
const campos = <T,>(...lista: readonly (Campo & { readonly key: Extract<keyof T, string> })[]): readonly Campo[] =>
  lista

const lugar = (): readonly Campo[] =>
  campos<PlaceBlock>(
    { key: 'label', label: 'Título', kind: 'texto', hint: 'Lo que va encima del lugar: «RECEPCIÓN».' },
    { key: 'place', label: 'Lugar', kind: 'texto' },
    { key: 'address', label: 'Dirección', kind: 'texto' },
    { key: 'time', label: 'Hora', kind: 'texto', hint: 'Tal cual se lee: «16:00 h».' },
  )

export const FORMAS: Record<SectionKey, FormaBloque> = {
  hero: {
    form: 'campos',
    fields: campos<HeroBlock>(
      // Las fotos justo después de los nombres: al fondo del bloque no se encontraban.
      { key: 'nameA', label: 'Primer nombre', kind: 'texto' },
      { key: 'nameB', label: 'Segundo nombre', kind: 'texto' },
      { key: 'coverImageId', label: 'Fotografía de portada', kind: 'imagen' },
      { key: 'portraitImageId', label: 'Retrato', kind: 'imagen' },
      { key: 'eyebrow', label: 'Texto sobre los nombres', kind: 'texto', hint: 'La línea de arriba: «MIS QUINCE» o «¡NOS CASAMOS!».' },
      { key: 'monogram', label: 'Iniciales', kind: 'texto', hint: 'Las que adornan la portada: «XV» o «M & R».' },
      { key: 'serial', label: 'Texto bajo los nombres', kind: 'texto', hint: 'Una línea pequeña debajo de los nombres, como el año.' },
    ),
  },
  quote: {
    form: 'campos',
    fields: campos<NonNullable<InvitationContent['quote']>>({ key: 'text', label: 'Frase', kind: 'parrafo' }),
  },
  hosts: ANFITRIONES.boda,
  schedule: {
    form: 'campos',
    fields: campos<NonNullable<InvitationContent['schedule']>>({
      key: 'startsAt',
      label: 'Fecha y hora exactas',
      kind: 'fecha',
      hint: 'Es la que usa la cuenta atrás de la invitación.',
    }),
  },
  ceremony: { form: 'campos', fields: lugar() },
  reception: { form: 'campos', fields: lugar() },
  map: {
    form: 'campos',
    fields: campos<NonNullable<InvitationContent['map']>>(
      { key: 'label', label: 'Nombre del lugar', kind: 'texto', hint: 'Lo que se lee sobre el mapa: «HACIENDA LAS ESTRELLAS».' },
      {
        key: 'href',
        label: 'Ubicación en Google Maps',
        kind: 'ubicacion',
        anchoCompleto: true,
        hint: 'Pega el enlace de «Compartir» de Google Maps o escribe la dirección. Tus invitados verán el mapa y el botón para llegar.',
      },
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
    // La paleta sí se pinta: una fila de círculos bajo el detalle, en los diseños que tienen vestimenta.
    list: { key: 'colors', label: 'Paleta de colores', itemLabel: 'color', kind: 'color', max: MAX_COLORES },
    // Sin lista de fotografías: **ninguno de los dieciséis diseños pinta las telas del
    // código de vestimenta**. El campo existía en el dominio desde el primer día y el
    // editor las pedía; lo que se subía ahí no aparecía en la invitación.
  },
  music: {
    form: 'campos',
    fields: campos<NonNullable<InvitationContent['music']>>(
      { key: 'track', label: 'Título de la canción', kind: 'texto' },
      { key: 'artist', label: 'Artista', kind: 'texto' },
      {
        key: 'audioMediaId',
        label: 'Archivo que suena',
        kind: 'audio',
        hint: 'La canción que suena. Súbela aquí mismo: MP3, M4A o WAV, entera. Sin archivo, el reproductor se ve pero no suena.',
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
      // Igual que la vestimenta: la fotografía de la despedida no la pinta ningún diseño.
    ),
  },
}
