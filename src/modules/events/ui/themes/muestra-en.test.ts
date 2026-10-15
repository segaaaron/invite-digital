import { describe, expect, it } from 'vitest'
import { muestraEnIngles } from './muestra-en'
import { themeDefinitions } from './registry'

/** Palabras que solo un texto en español lleva (los apellidos con «de» se quitan antes). */
const ESPANOL = /\b(el|los|las|la|del|que|con|para|por|nuestra|nuestro|nuestros|tu|tus|mis|mi|sin|una|un|y|es|te|nos|se|al|su|sus|o)\b|[¿¡]/i
/** Nombres y lugares: no se traducen. «Lucía Mendoza de Terán», «Parroquia San Mateo», «Av. …». */
const DIRECCION = /^(?:Av\.|Calle) |^[A-ZÁÉÍÓÚÑ'’ .]+$|^Salón de Eventos /
const NOMBRE_O_LUGAR = /^(?:[A-ZÁÉÍÓÚÑ][\wáéíóúñü.]*(?: (?:de|del|la|las|los|y|&|·|—|#\d+,?|\d+,?|[A-ZÁÉÍÓÚÑ][\wáéíóúñü.,]*))*)$/

const textos = (valor: unknown): string[] =>
  typeof valor === 'string' ? [valor] : Array.isArray(valor) ? valor.flatMap(textos) : valor !== null && typeof valor === 'object' ? Object.values(valor).flatMap(textos) : []

describe('la muestra de cada diseño en inglés', () => {
  it.each(themeDefinitions().map((t) => [t.key, t] as const))('%s no deja textos en español', (_, tema) => {
    const quedan = textos(muestraEnIngles(tema.defaultContent)).filter((x) => ESPANOL.test(x) && !NOMBRE_O_LUGAR.test(x) && !DIRECCION.test(x))
    expect(quedan).toEqual([])
  })
})
