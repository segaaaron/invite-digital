import { z } from 'zod'

/**
 * Los ajustes de Luxury, editables en Admin › Asistente (`app_settings['asistente.config']`):
 * qué planes lo traen, cuántos mensajes por evento y mes, y el techo de gasto del mes para todo el
 * sitio. Decidido el 28 de septiembre: solo Alta Costura, 300 mensajes y 20 USD.
 */
export type ConfigDelAsistente = {
  readonly planes: readonly string[]
  readonly mensajesPorMes: number
  readonly presupuestoUsd: number
}

export const CLAVE_DE_CONFIG = 'asistente.config'
export const CONFIG_POR_DEFECTO: ConfigDelAsistente = { planes: ['alta-costura'], mensajesPorMes: 300, presupuestoUsd: 20 }

const esquema = z.object({
  planes: z.array(z.string().trim().min(1).max(64)).max(20),
  mensajesPorMes: z.number().int().min(0).max(100_000),
  presupuestoUsd: z.number().min(0).max(10_000),
})

/** Lo guardado, o lo de por defecto si no hay nada o no se entiende: un ajuste roto no enciende nada nuevo. */
export function leerConfig(crudo: string | undefined): ConfigDelAsistente {
  if (crudo === undefined) return CONFIG_POR_DEFECTO
  try {
    const leido = esquema.safeParse(JSON.parse(crudo))
    return leido.success ? leido.data : CONFIG_POR_DEFECTO
  } catch {
    return CONFIG_POR_DEFECTO
  }
}

export function validarConfig(entrada: unknown): ConfigDelAsistente | null {
  const leido = esquema.safeParse(entrada)
  return leido.success ? leido.data : null
}

/**
 * Lo que cuesta una respuesta, en **millonésimas de dólar**, con los precios de gpt-6-luna por millón de
 * tokens: 0,10 la entrada, 0,01 la entrada en caché, 0,50 la salida. Un precio por millón es justo lo que
 * cuesta cada token en millonésimas. Se redondea hacia arriba: el techo no se come por redondeo.
 */
export const PRECIO_POR_MILLON = { entrada: 0.1, enCache: 0.01, salida: 0.5 } as const

export type UsoDeTokens = { readonly entrada: number; readonly enCache: number; readonly salida: number }

export const costeMicroUsd = (uso: UsoDeTokens): number =>
  Math.ceil(Math.max(0, uso.entrada - uso.enCache) * PRECIO_POR_MILLON.entrada + uso.enCache * PRECIO_POR_MILLON.enCache + uso.salida * PRECIO_POR_MILLON.salida)

/** Si el evento tiene Luxury: porque su plan lo trae (Admin › Asistente) o porque lo compró como extra. */
export const tieneLuxury = (capacidad: { readonly planSlug: string; readonly asistente?: boolean }, config: ConfigDelAsistente): boolean =>
  capacidad.asistente === true || config.planes.includes(capacidad.planSlug)

export type MotivoDeCierre = 'fuera_del_plan' | 'cuota' | 'presupuesto'

/**
 * Si el evento puede mandar **un mensaje más**. `mensajesDelMes` es cuántos lleva el evento este mes y
 * `gastoDelMesMicroUsd` lo gastado por todo el sitio.
 */
export function puedeConversar(
  config: ConfigDelAsistente,
  planSlug: string,
  uso: { readonly mensajesDelMes: number; readonly gastoDelMesMicroUsd: number },
  /** Si el evento lo compró como extra: entonces vale aunque su plan no lo traiga. */
  comprado = false,
): { ok: true } | { ok: false; motivo: MotivoDeCierre } {
  if (!comprado && !config.planes.includes(planSlug)) return { ok: false, motivo: 'fuera_del_plan' }
  if (uso.mensajesDelMes >= config.mensajesPorMes) return { ok: false, motivo: 'cuota' }
  if (uso.gastoDelMesMicroUsd >= config.presupuestoUsd * 1_000_000) return { ok: false, motivo: 'presupuesto' }
  return { ok: true }
}

export const MENSAJE_DE_CIERRE: Record<Exclude<MotivoDeCierre, 'fuera_del_plan'>, string> = {
  cuota: 'Este mes ya usaste todos los mensajes de tu asistente. Vuelve el mes que viene, o escribe a tu atelier.',
  presupuesto: 'El asistente está en pausa por hoy. Vuelve a intentarlo más tarde.',
}

/** El mes de Bolivia (UTC−4, sin horario de verano), `YYYY-MM`. */
export const mesEnBolivia = (ahora: Date): string => new Date(ahora.getTime() - 4 * 3_600_000).toISOString().slice(0, 7)
