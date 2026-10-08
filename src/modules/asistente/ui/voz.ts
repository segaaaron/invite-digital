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
