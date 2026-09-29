import { z } from 'zod'

/**
 * La conversación **no se guarda** (decidido el 28 de septiembre): la tiene el navegador y la manda
 * entera en cada mensaje. Por eso se valida como cualquier entrada de fuera y se recorta a los últimos
 * turnos, que es además el techo de lo que cuesta cada respuesta.
 */
export type Mensaje = { readonly rol: 'usuario' | 'asistente'; readonly texto: string }

export const MAX_TEXTO_DE_USUARIO = 2000
export const TURNOS_QUE_SE_MANDAN = 12

const esquema = z
  .array(z.object({ rol: z.enum(['usuario', 'asistente']), texto: z.string().max(6000) }).strict())
  .min(1)
  .max(80)

/** El historial que manda el navegador, o `null` si no es una conversación que acabe en una pregunta. */
export function leerHistorial(crudo: unknown): Mensaje[] | null {
  const leido = esquema.safeParse(crudo)
  if (!leido.success) return null
  const ultimo = leido.data.at(-1)!
  if (ultimo.rol !== 'usuario' || ultimo.texto.trim() === '' || ultimo.texto.length > MAX_TEXTO_DE_USUARIO) return null
  return leido.data.filter((m) => m.texto.trim() !== '').slice(-TURNOS_QUE_SE_MANDAN)
}
