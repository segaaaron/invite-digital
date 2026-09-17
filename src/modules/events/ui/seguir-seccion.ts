import type { InvitationContent, SectionKey } from '../domain/invitation-content'

/** El aviso que el editor lanza al abrir una sección, y que la vista previa escucha. */
export const EVENTO_SECCION = 'invitacion:seccion'

export type AvisoDeSeccion = { readonly seccion: SectionKey; readonly textos: readonly string[] }

/** Palabras que pinta la cuenta atrás en lugar de la fecha tal como se guarda. */
const ROTULOS_DE_CUENTA_ATRAS = ['días', 'horas', 'faltan']

const esArchivo = (clave: string): boolean => /(ImageId|MediaId|imageId|imageIds)$/.test(clave)

/**
 * Lo escrito en una sección, para encontrarla en la invitación: primero lo más largo, que es
 * lo más distintivo —«Hacienda Las Estrellas» antes que «19:00», que puede salir en otro
 * sitio—.
 */
export function textosDeSeccion(content: InvitationContent, seccion: SectionKey): string[] {
  const bloque = content[seccion]
  const textos: string[] = []
  const recoger = (valor: unknown, clave = '') => {
    if (esArchivo(clave)) return
    if (typeof valor === 'string') {
      if (valor.trim().length >= 3) textos.push(valor.trim())
    } else if (Array.isArray(valor)) {
      for (const v of valor) recoger(v)
    } else if (valor !== null && typeof valor === 'object') {
      for (const [k, v] of Object.entries(valor)) recoger(v, k)
    }
  }
  if (seccion !== 'schedule') recoger(bloque)
  const ordenados = [...new Set(textos)].sort((a, b) => b.length - a.length)
  return seccion === 'schedule' ? ROTULOS_DE_CUENTA_ATRAS : ordenados
}

const normal = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[·•|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * El primer elemento de la invitación que dice alguno de estos textos, probándolos en orden.
 *
 * ponytail: se busca por el texto pintado, no por una marca en cada vista. Los dieciséis
 * diseños componen distinto y ninguno marca sus secciones; si un día hace falta precisión
 * —dos secciones con el mismo texto—, la mejora es un `data-seccion` en cada vista.
 */
export function buscarEnInvitacion(raiz: HTMLElement, textos: readonly string[]): HTMLElement | null {
  const nodos: Text[] = []
  const recorrido = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT)
  for (let nodo = recorrido.nextNode(); nodo !== null; nodo = recorrido.nextNode()) {
    if ((nodo as Text).data.trim() !== '') nodos.push(nodo as Text)
  }
  for (const texto of textos) {
    const buscado = normal(texto)
    if (buscado.length < 3) continue
    const hallado = nodos.find((nodo) => normal(nodo.data).includes(buscado))
    if (hallado?.parentElement) return hallado.parentElement
    // La galería pone su rótulo en el texto alternativo de la foto, no como texto visible.
    const conAlt = [...raiz.querySelectorAll<HTMLElement>('[alt], [aria-label]')].find((el) =>
      normal(el.getAttribute('alt') ?? el.getAttribute('aria-label') ?? '').includes(buscado),
    )
    if (conAlt !== undefined) return conAlt
  }
  return null
}

/**
 * Lo que se enmarca: no la línea encontrada, sino la pieza que la contiene —la tarjeta de la
 * recepción, la fila de la cuenta atrás—. Se sube mientras el elemento sea más bajo que
 * `altoMinimo`, sin pasar de la raíz.
 */
/** Más alto que esto ya no es una pieza, es la invitación. */
const TOPE_DE_PIEZA = 900

export function piezaQueContiene(elemento: HTMLElement, raiz: HTMLElement, altoMinimo = 120): HTMLElement {
  let actual = elemento
  while (
    actual.parentElement !== null &&
    actual.parentElement !== raiz &&
    actual.getBoundingClientRect().height < altoMinimo &&
    // Sin saltar a un contenedor de media invitación: una pieza pequeña —el reproductor— que
    // cuelga de la columna entera se queda en sí misma.
    actual.parentElement.getBoundingClientRect().height <= TOPE_DE_PIEZA
  ) {
    actual = actual.parentElement
  }
  return actual
}
