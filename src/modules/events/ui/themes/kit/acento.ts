import { variableDeAcento, type AcentoDelDiseno } from '../../../domain/estilo'

/**
 * Un color con transparencia, venga como venga: hexadecimal o `var(--acento-…, …)`. Con
 * `color-mix` contra transparente la mezcla es exactamente ese color con esa opacidad.
 */
export const conAlfa = (color: string, a: number): string => `color-mix(in srgb, ${color} ${Math.round(a * 1000) / 10}%, transparent)`

/**
 * La familia del acento de un diseño, lista para su paleta (Gala, `0088`).
 *
 * Cada color de la familia sale como `var(--acento-<nombre>, <original>)`: **sin estilo elegido,
 * el respaldo es el valor de siempre** y la invitación no cambia ni un píxel; con estilo, las
 * variables las pone `EstiloDeLaInvitacion` alrededor del diseño. Lo que era un `rgba()` del
 * acento se escribe con `alfa`, que da la misma transparencia sobre el color que toque.
 *
 * Solo se recolorea lo que el diseño pinta en código: el arte de las imágenes no cambia.
 */
export function acentoDe<const F extends Record<string, string>>(principal: keyof F & string, familia: F, fondo: string) {
  const colores = Object.fromEntries(Object.entries(familia).map(([nombre, hex]) => [nombre, `var(${variableDeAcento(nombre)}, ${hex})`])) as {
    readonly [K in keyof F]: string
  }
  const definicion: AcentoDelDiseno = { principal: familia[principal] as string, familia, fondo }
  return {
    colores,
    /** El color de la familia con transparencia: lo que antes era `rgba(r,g,b,a)`. */
    alfa: (nombre: keyof F & string, a: number): string => conAlfa(colores[nombre], a),
    definicion,
  }
}
