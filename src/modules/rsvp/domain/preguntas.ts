import { err, ok, type Result } from '@/shared/result'
import { rsvpError, type RsvpError } from './errors'

/**
 * Lo que se pregunta al confirmar, además de si viene: la **canción** para la fiesta, el **menú**
 * y **a qué actos** asiste (civil, iglesia, fiesta). Lo elige el anfitrión; sin elegir nada, el
 * formulario es el de siempre.
 *
 * Los actos son informativos: el recuento para el catering, las mesas y la puerta sigue siendo
 * el de la fiesta.
 */
export type PreguntasDelRsvp = { readonly cancion: boolean; readonly menus: readonly string[]; readonly actos: readonly string[] }
export const SIN_PREGUNTAS: PreguntasDelRsvp = { cancion: false, menus: [], actos: [] }

export type ExtrasDeRespuesta = { readonly song: string | null; readonly menu: string | null; readonly acts: readonly string[] }
export const SIN_EXTRAS: ExtrasDeRespuesta = { song: null, menu: null, acts: [] }

const MAX_CANCION = 200
const MAX_MENUS = 6
const MAX_ACTOS = 4
const MAX_OPCION = 60

export const hayPreguntas = (p: PreguntasDelRsvp): boolean => p.cancion || p.menus.length > 0 || p.actos.length > 0

/** Lo que mandó el invitado, contra lo que se le preguntó. Lo que no se preguntó se descarta. */
export function leerExtras(crudo: { song?: string | null; menu?: string | null; acts?: readonly string[] }, p: PreguntasDelRsvp): Result<ExtrasDeRespuesta, RsvpError> {
  const cancion = p.cancion ? (crudo.song ?? '').trim() : ''
  if (cancion.length > MAX_CANCION) return err(rsvpError('invalid_payload', `La canción pasa de ${MAX_CANCION} caracteres`))

  const menu = p.menus.length > 0 ? (crudo.menu ?? '').trim() : ''
  if (menu !== '' && !p.menus.includes(menu)) return err(rsvpError('invalid_payload', `Menú desconocido: ${menu}`))

  const actos = p.actos.length > 0 ? [...new Set(crudo.acts ?? [])] : []
  if (actos.some((a) => !p.actos.includes(a))) return err(rsvpError('invalid_payload', 'Acto desconocido'))

  return ok({ song: cancion === '' ? null : cancion, menu: menu === '' ? null : menu, acts: p.actos.filter((a) => actos.includes(a)) })
}

const lineas = (texto: string): string[] => {
  const vistas = new Set<string>()
  return texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => {
      const clave = l.toLocaleLowerCase('es')
      if (l === '' || vistas.has(clave)) return false
      vistas.add(clave)
      return true
    })
}

/** La configuración del anfitrión: una opción por línea. */
export function leerPreguntas(input: { cancion: boolean; menus: string; actos: string }): Result<PreguntasDelRsvp, RsvpError> {
  const menus = lineas(input.menus)
  const actos = lineas(input.actos)
  if (menus.length > MAX_MENUS) return err(rsvpError('invalid_payload', `Hasta ${MAX_MENUS} menús.`))
  if (actos.length > MAX_ACTOS) return err(rsvpError('invalid_payload', `Hasta ${MAX_ACTOS} actos.`))
  if ([...menus, ...actos].some((o) => o.length > MAX_OPCION)) return err(rsvpError('invalid_payload', `Cada opción, hasta ${MAX_OPCION} caracteres.`))
  return ok({ cancion: input.cancion, menus, actos })
}

export type ResultadosDePreguntas = {
  /** Las canciones pedidas, con quién las pidió. */
  readonly canciones: readonly { readonly cancion: string; readonly invitacion: string }[]
  readonly menus: readonly { readonly opcion: string; readonly veces: number }[]
  /** Cuántas invitaciones van a cada acto (no personas: el acto se marca por invitación). */
  readonly actos: readonly { readonly opcion: string; readonly veces: number }[]
}
