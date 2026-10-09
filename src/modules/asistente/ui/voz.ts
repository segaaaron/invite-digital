/**
 * **La voz de Luxury** (7 de octubre): en español, una mujer latinoamericana; en inglés, una mujer nativa.
 * Son las voces del propio aparato (gratis): cada sistema trae las suyas, así que se puntúan por idioma,
 * por nombre conocido de voz femenina y por calidad («Natural», «Premium», «Enhanced» suenan a persona).
 */
export type VozDelAparato = { readonly name: string; readonly lang: string }

const LATAM = /^es[-_](419|MX|US|AR|BO|CO|PE|CL|EC|VE|UY|PY|CR|GT|HN|NI|PA|PR|DO|SV|CU)$/i
/** Voces femeninas conocidas de macOS/iOS, Chrome, Edge/Windows y Android. */
const FEMENINAS = /paulina|ang[eé]lica|sof[ií]a|dalia|paloma|sabina|salom[eé]|camila|elena|valentina|ximena|renata|catalina|larissa|samantha|ava|allison|susan|zoe|aria|jenny|michelle|emma|ana\b|libby|sonia|karen|moira|tessa|serena|nicky|joanna|salli|kimberly|google (español|us english)|female|mujer/i
const MASCULINAS = /\b(juan|jorge|diego|carlos|ra[uú]l|pablo|gonzalo|tom[aá]s|federico|emilio|alex|daniel|fred|tom|aaron|arthur|guy|andrew|brian|christopher|eric|roger|steffan|jorge|lorenzo|alonso|gerardo|male|hombre)\b/i
const CALIDAD = /natural|premium|enhanced|mejorada|neural|online/i

function puntos(v: VozDelAparato, idioma: 'es' | 'en'): number {
  const lang = v.lang.replace('_', '-')
  let p = 0
  if (idioma === 'es') {
    if (!lang.toLowerCase().startsWith('es')) return -1
    p += LATAM.test(lang) ? 50 : 5
    if (/es-BO/i.test(lang)) p += 5
  } else {
    if (!lang.toLowerCase().startsWith('en')) return -1
    p += /en-US/i.test(lang) ? 50 : /en-(GB|CA|AU)/i.test(lang) ? 40 : 20
  }
  if (FEMENINAS.test(v.name)) p += 40
  if (MASCULINAS.test(v.name)) p -= 60
  if (CALIDAD.test(v.name)) p += 30
  if (/google/i.test(v.name)) p += 10
  return p
}

/** La mejor voz para ese idioma, o `undefined` si el aparato no trae ninguna (habla la de por defecto). */
export function elegirVoz<V extends VozDelAparato>(voces: readonly V[], idioma: 'es' | 'en'): V | undefined {
  let mejor: V | undefined
  let mejores = -1
  for (const v of voces) {
    const p = puntos(v, idioma)
    if (p > mejores) {
      mejor = v
      mejores = p
    }
  }
  return mejores < 0 ? undefined : mejor
}

const PALABRAS_ES = /\b(el|la|los|las|de|que|y|en|un|una|tu|tus|para|con|por|es|está|ya|listo|invitados?)\b|[ñ¿¡áéíóú]/gi
const PALABRAS_EN = /\b(the|and|you|your|to|of|is|are|for|with|done|guests?|ready|it|this)\b/gi

/** En qué idioma está la respuesta: Luxury contesta en el idioma en que se le escribe, y la voz la sigue. */
export function idiomaDelTexto(texto: string, porDefecto: 'es' | 'en'): 'es' | 'en' {
  const es = texto.match(PALABRAS_ES)?.length ?? 0
  const en = texto.match(PALABRAS_EN)?.length ?? 0
  if (es === en) return porDefecto
  return es > en ? 'es' : 'en'
}

/**
 * **Cómo se le habla a Luxury en este aparato** (8 de octubre: en iPhone el micrófono no escuchaba).
 * - `navegador`: el reconocimiento de voz del navegador (Web Speech), con un idioma que ese navegador trae.
 * - `teclado`: el dictado del propio teclado del celular. WebKit **no** trae el reconocimiento en las apps de
 *   la pantalla de inicio (bug 225298), que es como se instala el panel para los avisos; ahí, y donde no hay
 *   reconocedor, el micrófono abre el teclado y se dicta con su micrófono. Gratis y nativo.
 * - `ninguno`: computadora sin reconocedor (Firefox): se escribe.
 */
export type ComoDictar = { modo: 'navegador'; lang: string } | { modo: 'teclado' } | { modo: 'ninguno' }

/** Los españoles que trae el dictado de Apple; el resto (es-BO, es-PE…) no devuelve nada. */
const ESPANOL_DE_APPLE = /^es-(ES|MX|US|CL|CO)$/i

export function comoDictar(aparato: { ua: string; instalada: boolean; tactil: boolean; lang: string; conReconocedor: boolean }): ComoDictar {
  // El iPad se presenta como Mac; se le distingue por la pantalla táctil.
  const esApple = /iPhone|iPad|iPod/.test(aparato.ua) || (/Macintosh/.test(aparato.ua) && aparato.tactil)
  if (esApple && aparato.instalada) return { modo: 'teclado' }
  if (!aparato.conReconocedor) return aparato.tactil ? { modo: 'teclado' } : { modo: 'ninguno' }
  const lang = aparato.lang || 'es-BO'
  if (esApple && /^es\b/i.test(lang) && !ESPANOL_DE_APPLE.test(lang)) return { modo: 'navegador', lang: 'es-MX' }
  return { modo: 'navegador', lang }
}

/**
 * **Leer mientras llega** (8 de octubre): la respuesta se lee por frases según va llegando, sin esperar al final.
 * Una frase está lista cuando termina en `.`, `!`, `?` o salto de línea seguido de espacio o del final; lo
 * demás espera. «1.500,50» no corta: después del punto no hay espacio.
 */
export function frasesListas(texto: string): { frases: string[]; resto: string } {
  const frases: string[] = []
  const corte = /[.!?…]+(?=\s)|\n/g
  let desde = 0
  for (let m = corte.exec(texto); m !== null; m = corte.exec(texto)) {
    const fin = m[0] === '\n' ? m.index : m.index + m[0].length
    const frase = texto.slice(desde, fin).trim()
    if (frase !== '') frases.push(frase)
    desde = fin
  }
  return { frases, resto: texto.slice(desde) }
}

/** Las pantallas del panel por su nombre: un enlace leído en voz alta no dice nada. */
const PANTALLAS: Record<string, string> = {
  invitados: 'Invitados', mesas: 'Mesas', regalos: 'Regalos', mensajes: 'Mensajes', configuracion: 'Mi invitación', 'vista-previa': 'Ver mi invitación',
  checkin: 'Ingreso al evento', equipo: 'Equipo', extras: 'Extras', 'dia-d': 'Día D', tareas: 'Plan de tareas', presupuesto: 'Presupuesto',
  agenda: 'Agenda', proveedores: 'Proveedores', cronograma: 'Cronograma', cortejo: 'Cortejo', documentos: 'Documentos',
}

/** El texto tal como se lee: sin enlaces (la pantalla por su nombre), sin marcas y sin guiones de lista. */
export function paraLeer(texto: string): string {
  return texto
    .replace(/\/panel\/eventos\/[^/\s]+(?:\/planner)?\/?([a-z-]*)[^\s,.;:)]*/g, (_, p: string) => PANTALLAS[p] ?? 'el panel')
    .replace(/[*_#`]/g, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '')
    .join('. ')
    .replace(/\.\.\s/g, '. ')
}

/** «Listo», «gracias», «eso es todo»: la conversación por voz termina (sin enviar nada a Luxury). */
export function esDespedida(dicho: string): boolean {
  const t = dicho
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return /^(ok |bueno |)(listo|ya|ya esta|gracias|muchas gracias|eso es todo|eso seria todo|nada mas|nada mas gracias|adios|chao|chau|hasta luego|terminar|termina|basta|para|thanks|thank you|that's all|thats all|bye|stop|done)( gracias| luxury)?$/.test(t)
}
