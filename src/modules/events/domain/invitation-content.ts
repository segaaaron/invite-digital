/**
 * El contenido rico de la invitación: lo que los dieciséis diseños pintan y `events` no
 * guarda —ceremonia y recepción por separado, itinerario, galería, código de vestimenta,
 * anfitriones, canción—.
 *
 * Vive en un solo `jsonb` y no en diecinueve columnas porque se lee entero, se edita
 * entero y tres de los bloques son listas. La base garantiza que es JSON; que sea **este**
 * JSON lo garantiza este archivo, al leerlo y al escribirlo.
 *
 * Módulo puro: sin Drizzle, sin `Date.now`, sin nada de `infrastructure`.
 */

/** Cuánto texto cabe en cada clase de campo. Nada impide pegar una novela en un textarea. */
const LIMITES = { corto: 120, medio: 240, largo: 600 } as const

/**
 * Cuántas filas admite cada lista. El diseño reserva un sitio concreto para ellas.
 *
 * Se exporta porque el editor del panel deja de ofrecer «añadir» al llegar al tope: un
 * formulario que admite una fila trece y un dominio que la descarta al guardar es la peor
 * de las dos cosas, porque el atelier ve su trabajo desaparecer sin que nadie se lo diga.
 */
export const MAXIMOS = { itinerary: 12, gallery: 6, hosts: 12, notes: 4 } as const

export type HeroBlock = {
  readonly eyebrow?: string
  readonly nameA?: string
  readonly nameB?: string
  readonly monogram?: string
  readonly serial?: string
  readonly coverImageId?: string
  readonly portraitImageId?: string
}

export type PlaceBlock = {
  readonly label?: string
  readonly place?: string
  readonly address?: string
  readonly time?: string
}

/**
 * Una fila del itinerario.
 *
 * `note` es la línea secundaria: varios diseños emparejan la hora con un encabezado y un
 * detalle debajo —«SC.02 · INT. CAPILLA. NOCHE. · Ceremonia 19:00»—, y sin ella habría que
 * meter las dos cosas en el mismo campo y perder el salto que el diseño compone.
 */
export type ItineraryRow = {
  readonly time: string
  readonly label: string
  readonly note?: string
  readonly imageId?: string
}
/**
 * Una casilla de la galería.
 *
 * El rótulo manda y la imagen es opcional, no al revés: estos diseños pintan la galería
 * como huecos con su pie —«2018», «Italia», «Propuesta»— desde el primer día, y las fotos
 * las sube el atelier después. Con la imagen obligatoria, la sección entera desaparecería
 * hasta que subiera la primera, y el diseño se quedaría con un salto en medio.
 */
export type GalleryRow = { readonly label: string; readonly imageId?: string }

/** Un aviso con su título y su explicación. */
export type NoteCard = { readonly title: string; readonly text?: string }

export type InvitationContent = {
  readonly hero?: HeroBlock
  readonly quote?: { readonly text: string }
  readonly hosts?: { readonly label?: string; readonly names: readonly string[] }
  readonly schedule?: { readonly startsAt: string }
  readonly ceremony?: PlaceBlock
  readonly reception?: PlaceBlock
  readonly map?: { readonly label?: string; readonly coords?: string; readonly href?: string }
  readonly itinerary?: readonly ItineraryRow[]
  readonly dressCode?: {
    readonly title?: string
    readonly note?: string
    readonly detail?: string
    readonly imageIds?: readonly string[]
  }
  /**
   * La canción del evento: lo que se lee y, si el atelier subió un MP3, lo que suena.
   *
   * `audioMediaId` apunta a una fila de `event_media` del propio evento, igual que las
   * fotografías. Es opcional y los dieciséis diseños viven sin él: traen su canción escrita
   * desde el primer día y el reproductor solo mueve sus barras.
   */
  readonly music?: { readonly track?: string; readonly artist?: string; readonly audioMediaId?: string }
  readonly gallery?: readonly GalleryRow[]
  /**
   * Los avisos sueltos que varios diseños pintan en su propia tarjeta: «Solo adultos»,
   * «Lluvia de sobres», «Habrá transporte desde la plaza».
   *
   * Es una lista y no un campo por aviso porque cada boda tiene los suyos y no se pueden
   * enumerar: la que pide no llevar niños, la que avisa del frío del salón, la que explica
   * dónde aparcar. Un bloque por cada uno convertiría el modelo en la unión de dieciséis
   * caprichos.
   */
  readonly notes?: readonly NoteCard[]
  readonly closing?: { readonly text?: string; readonly signature?: string; readonly imageId?: string }
}

export type SectionKey = keyof InvitationContent

/** Las doce secciones, en el orden en que un diseño las suele pintar. */
export const SECTION_KEYS: readonly SectionKey[] = [
  'hero',
  'quote',
  'hosts',
  'schedule',
  'ceremony',
  'reception',
  'map',
  'itinerary',
  'dressCode',
  'music',
  'gallery',
  'notes',
  'closing',
]

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor)

/** Un texto recortado y con tope. Devuelve `undefined` si no queda nada, que es lo que no se pinta. */
function texto(valor: unknown, tope: number = LIMITES.medio): string | undefined {
  if (typeof valor !== 'string') return undefined
  const limpio = valor.trim().slice(0, tope)
  return limpio.length === 0 ? undefined : limpio
}

/**
 * Un objeto con solo las claves que se reconocen, o `undefined` si no quedó ninguna.
 *
 * Descartar las claves desconocidas no es puntillismo: `blocks` es un `jsonb` y lo que
 * entre por ahí acaba en un `<img src>` o en un `<a href>` si nadie lo filtra.
 */
function bloque<T extends object>(entradas: [keyof T, string | undefined][]): T | undefined {
  const salida = Object.fromEntries(entradas.filter(([, valor]) => valor !== undefined)) as T
  return Object.keys(salida).length === 0 ? undefined : salida
}

/** Una lista filtrada y con tope. Vacía es `undefined`: para el diseño es lo mismo que ausente. */
function lista<T>(valor: unknown, maximo: number, fila: (crudo: unknown) => T | undefined): readonly T[] | undefined {
  if (!Array.isArray(valor)) return undefined
  const filas = valor.map(fila).filter((f): f is T => f !== undefined)
  return filas.length === 0 ? undefined : filas.slice(0, maximo)
}

/**
 * La fecha y hora de la cuenta atrás.
 *
 * `events.event_date` es un día del calendario a propósito y así se queda; la cuenta atrás
 * necesita la hora, y vive aquí porque es contenido de la invitación. Ilegible es lo mismo
 * que ausente: un `Invalid Date` en la cuenta atrás pinta «NaN días».
 */
function marcaDeTiempo(valor: unknown): string | undefined {
  const crudo = texto(valor, LIMITES.corto)
  if (crudo === undefined) return undefined
  return Number.isNaN(new Date(crudo).getTime()) ? undefined : crudo
}

function lugar(valor: unknown): PlaceBlock | undefined {
  if (!esObjeto(valor)) return undefined
  return bloque<PlaceBlock>([
    ['label', texto(valor.label, LIMITES.corto)],
    ['place', texto(valor.place)],
    ['address', texto(valor.address)],
    ['time', texto(valor.time, LIMITES.corto)],
  ])
}

/**
 * Lee lo guardado y devuelve solo lo que se puede pintar.
 *
 * Nunca lanza. Una fila mal formada se descarta y las buenas se conservan: una invitación
 * que revienta entera porque un bloque está mal es peor que una invitación sin ese bloque,
 * y quien está al otro lado vino a mirar una invitación, no un panel.
 */
export function parseInvitationContent(crudo: unknown): InvitationContent {
  if (!esObjeto(crudo)) return {}

  const salida: Record<string, unknown> = {}

  if (esObjeto(crudo.hero)) {
    const hero = crudo.hero
    salida.hero = bloque<HeroBlock>([
      ['eyebrow', texto(hero.eyebrow, LIMITES.corto)],
      ['nameA', texto(hero.nameA, LIMITES.corto)],
      ['nameB', texto(hero.nameB, LIMITES.corto)],
      ['monogram', texto(hero.monogram, 16)],
      ['serial', texto(hero.serial, 32)],
      ['coverImageId', texto(hero.coverImageId, LIMITES.corto)],
      ['portraitImageId', texto(hero.portraitImageId, LIMITES.corto)],
    ])
  }

  if (esObjeto(crudo.quote)) {
    const t = texto(crudo.quote.text, LIMITES.largo)
    if (t !== undefined) salida.quote = { text: t }
  }

  if (esObjeto(crudo.hosts)) {
    const nombres = lista(crudo.hosts.names, MAXIMOS.hosts, (n) => texto(n, LIMITES.corto))
    if (nombres !== undefined) {
      const etiqueta = texto(crudo.hosts.label, LIMITES.corto)
      salida.hosts = etiqueta === undefined ? { names: nombres } : { label: etiqueta, names: nombres }
    }
  }

  if (esObjeto(crudo.schedule)) {
    const inicio = marcaDeTiempo(crudo.schedule.startsAt)
    if (inicio !== undefined) salida.schedule = { startsAt: inicio }
  }

  const ceremonia = lugar(crudo.ceremony)
  if (ceremonia !== undefined) salida.ceremony = ceremonia

  const recepcion = lugar(crudo.reception)
  if (recepcion !== undefined) salida.reception = recepcion

  if (esObjeto(crudo.map)) {
    salida.map = bloque<NonNullable<InvitationContent['map']>>([
      ['label', texto(crudo.map.label, LIMITES.corto)],
      ['coords', texto(crudo.map.coords, LIMITES.corto)],
      ['href', texto(crudo.map.href)],
    ])
  }

  const itinerario = lista<ItineraryRow>(crudo.itinerary, MAXIMOS.itinerary, (fila) => {
    if (!esObjeto(fila)) return undefined
    const hora = texto(fila.time, LIMITES.corto)
    const etiqueta = texto(fila.label, LIMITES.corto)
    if (hora === undefined || etiqueta === undefined) return undefined
    const imagen = texto(fila.imageId, LIMITES.corto)
    const nota = texto(fila.note, LIMITES.corto)
    return {
      time: hora,
      label: etiqueta,
      ...(nota === undefined ? {} : { note: nota }),
      ...(imagen === undefined ? {} : { imageId: imagen }),
    }
  })
  if (itinerario !== undefined) salida.itinerary = itinerario

  if (esObjeto(crudo.dressCode)) {
    const dc = crudo.dressCode
    const imagenes = lista(dc.imageIds, 4, (i) => texto(i, LIMITES.corto))
    const base = bloque<{ title?: string; note?: string; detail?: string }>([
      ['title', texto(dc.title, LIMITES.corto)],
      ['note', texto(dc.note, LIMITES.corto)],
      ['detail', texto(dc.detail)],
    ])
    if (base !== undefined || imagenes !== undefined) {
      salida.dressCode = imagenes === undefined ? base : { ...base, imageIds: imagenes }
    }
  }

  if (esObjeto(crudo.music)) {
    salida.music = bloque<NonNullable<InvitationContent['music']>>([
      ['track', texto(crudo.music.track, LIMITES.corto)],
      ['artist', texto(crudo.music.artist, LIMITES.corto)],
      ['audioMediaId', texto(crudo.music.audioMediaId, LIMITES.corto)],
    ])
  }

  const galeria = lista<GalleryRow>(crudo.gallery, MAXIMOS.gallery, (fila) => {
    if (!esObjeto(fila)) return undefined
    const etiqueta = texto(fila.label, LIMITES.corto)
    if (etiqueta === undefined) return undefined
    const imagen = texto(fila.imageId, LIMITES.corto)
    return imagen === undefined ? { label: etiqueta } : { label: etiqueta, imageId: imagen }
  })
  if (galeria !== undefined) salida.gallery = galeria

  const avisos = lista<NoteCard>(crudo.notes, MAXIMOS.notes, (fila) => {
    if (!esObjeto(fila)) return undefined
    const titulo = texto(fila.title, LIMITES.corto)
    if (titulo === undefined) return undefined
    const cuerpo = texto(fila.text, LIMITES.largo)
    return cuerpo === undefined ? { title: titulo } : { title: titulo, text: cuerpo }
  })
  if (avisos !== undefined) salida.notes = avisos

  if (esObjeto(crudo.closing)) {
    salida.closing = bloque<NonNullable<InvitationContent['closing']>>([
      ['text', texto(crudo.closing.text, LIMITES.largo)],
      ['signature', texto(crudo.closing.signature, LIMITES.corto)],
      ['imageId', texto(crudo.closing.imageId, LIMITES.corto)],
    ])
  }

  // `bloque` devuelve `undefined` cuando no quedó ninguna clave, y esas entradas se
  // quitan: un `{ hero: undefined }` no es lo mismo que `{}` a la hora de comparar.
  for (const clave of Object.keys(salida)) {
    if (salida[clave] === undefined) delete salida[clave]
  }

  return salida as InvitationContent
}

/**
 * Rellena con el contenido del diseño lo que el atelier no haya escrito.
 *
 * **El bloque es la unidad, no el campo.** Mezclar la canción que puso el atelier con el
 * artista que traía la maqueta produce una línea que no escribió nadie —«Perfect, de Etta
 * James»—, y esa línea se lee como un error del atelier.
 *
 * Y nunca al revés: cambiar de diseño no puede llevarse por delante el itinerario que ya
 * estaba cargado. Sería la peor forma posible de descubrir esta regla.
 */
export function mergeContent(delDiseno: InvitationContent, delAtelier: InvitationContent): InvitationContent {
  const salida: Record<string, unknown> = {}
  for (const clave of SECTION_KEYS) {
    const propio = delAtelier[clave]
    const muestra = delDiseno[clave]
    const elegido = propio ?? muestra
    if (elegido !== undefined) salida[clave] = elegido
  }
  return salida as InvitationContent
}
