import type { EfectoDeExtra, NotaDeFila, PrecioDeFila } from '@/modules/plans'
import type { Dictionary } from '@/shared/i18n/dictionary'

/**
 * **Las filas de la comparativa, en el orden del documento del 30 de octubre.** Una sola lista para la
 * portada y para las páginas de Bodas y XV (documento del 6 nov: «las tarjetas y la tabla deben quedar
 * iguales a las de la página principal»).
 *
 * No son todas las que el diccionario sabe escribir: lo que traen los tres planes igual se enseña arriba,
 * en el recuadro de «Todos los planes incluyen». «Sugerencia de regalos» es la excepción a propósito: la
 * traen los tres y aun así se compara, porque la tarjeta de Atelier la promete.
 */
const FILAS = [
  'fotos',
  'colores',
  'tipografias',
  'secciones',
  'detalles',
  'sugerencia',
  'regalos',
  'libro',
  'album',
  'plannerCompleto',
  'panel',
  'recordatorios',
  'mesas',
  'puerta',
  'porteros',
  'plannerTotal',
  'luxury',
  'rondas',
  'entrega',
  'enLinea',
] as const

type Comparacion = Dictionary['pricing']['comparison']

/**
 * Las filas que se pintan y su texto. El tope de invitaciones solo se compara si existe (con los planes de
 * hoy ninguno lo tiene y la línea «Envíos ilimitados» va en el recuadro); Luxury solo si se vende.
 */
export function filasDeLaTabla(comparacion: Comparacion, opciones: { conTope: boolean; conLuxury: boolean }): Comparacion['filas'] {
  const claves = FILAS.flatMap((clave) => {
    if (clave === 'luxury' && !opciones.conLuxury) return []
    return clave === 'panel' && opciones.conTope ? (['grupos', clave] as const) : [clave]
  })
  return Object.fromEntries(claves.map((clave) => [clave, comparacion.filas[clave]])) as Comparacion['filas']
}

/** El recuadro de lo que traen todos: «Envíos ilimitados» entra solo mientras ningún plan tenga tope. */
export function lineasQueIncluyenTodos(dictionary: Dictionary, conTope: boolean): readonly string[] {
  const { incluyenItems, enviosIlimitados } = dictionary.portada.comparativa
  return conTope ? incluyenItems : [...incluyenItems.slice(0, 4), enviosIlimitados, ...incluyenItems.slice(4)]
}

/** Qué fila de la tabla cubre cada extra que se vende sobre los planes que no lo traen. */
const FILA_DEL_EXTRA: Partial<Record<EfectoDeExtra, PrecioDeFila['fila']>> = {
  fotos_invitados: 'album',
  dia_d: 'plannerTotal',
  asistente: 'luxury',
}

/** Los precios de extra que van en la tabla, y el tope del álbum que acompaña al de las fotos. */
export function preciosDeLaTabla(
  extras: ReadonlyArray<{ effect: EfectoDeExtra; priceCents: number }>,
  conPrecio: (cents: number) => string,
  comparacion: Comparacion,
): { precios: PrecioDeFila[]; notas: Partial<Record<PrecioDeFila['fila'], NotaDeFila>> } {
  const precios = extras.flatMap((x) => {
    const fila = FILA_DEL_EXTRA[x.effect]
    return fila === undefined || x.priceCents <= 0 ? [] : [{ fila, efecto: x.effect, precio: conPrecio(x.priceCents) }]
  })
  return { precios, notas: { album: comparacion.albumNota } }
}
