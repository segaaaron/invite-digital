import { pg } from './client'

/** El canal que escriben los disparadores de la `0070`. */
export const CANAL_DE_CAMBIOS = 'cambio_de_evento'

/** `resync`: la escucha se reconectó y pudo perderse algo; quien lo reciba, que se ponga al día. */
export type TipoDeCambio = 'rsvp' | 'ingreso' | 'visita' | 'resync'

type Oyente = (tipo: TipoDeCambio, version: number) => void

type Bus = {
  readonly oyentes: Map<string, Set<Oyente>>
  /** Un número por evento que sube con cada aviso: viaja como `id:` del SSE y vuelve en `Last-Event-ID`. */
  readonly versiones: Map<string, number>
  escuchando: Promise<unknown> | null
}

// En `globalThis`: la recarga en caliente de desarrollo volvería a abrir otra escucha por cada edición.
const global = globalThis as unknown as { __busDeCambios?: Bus }
const bus: Bus = (global.__busDeCambios ??= { oyentes: new Map(), versiones: new Map(), escuchando: null })

const TIPOS = new Set<TipoDeCambio>(['rsvp', 'ingreso', 'visita'])

/** El aviso de Postgres, `{"e": "<evento>", "t": "<tipo>"}`. Cualquier otra cosa se ignora. */
export function leerAviso(texto: string): { eventId: string; tipo: TipoDeCambio } | null {
  try {
    const aviso = JSON.parse(texto) as { e?: unknown; t?: unknown }
    if (typeof aviso.e !== 'string' || typeof aviso.t !== 'string' || !TIPOS.has(aviso.t as TipoDeCambio)) return null
    return { eventId: aviso.e, tipo: aviso.t as TipoDeCambio }
  } catch {
    return null
  }
}

/** Reparte un aviso a quien escucha ese evento. Exportado para probarlo sin base. */
export function repartir(eventId: string, tipo: TipoDeCambio): void {
  const version = (bus.versiones.get(eventId) ?? 0) + 1
  bus.versiones.set(eventId, version)
  for (const oyente of bus.oyentes.get(eventId) ?? []) oyente(tipo, version)
}

export const versionDe = (eventId: string): number => bus.versiones.get(eventId) ?? 0

/**
 * Una sola escucha para todo el proceso, abierta la primera vez que alguien se suscribe.
 * `postgres.js` le da una conexión propia, fuera del pool, y la reconecta sola; al volver
 * (`onlisten` tras la primera vez) se avisa `resync` a todos, porque en el corte pudo perderse algo.
 */
function asegurarEscucha(): void {
  if (bus.escuchando !== null) return
  let primera = true
  bus.escuchando = pg
    .listen(
      CANAL_DE_CAMBIOS,
      (texto) => {
        const aviso = leerAviso(texto)
        if (aviso !== null) repartir(aviso.eventId, aviso.tipo)
      },
      () => {
        if (primera) {
          primera = false
          return
        }
        for (const eventId of bus.oyentes.keys()) repartir(eventId, 'resync')
      },
    )
    .catch((causa: unknown) => {
      // Sin escucha no hay tiempo real, pero el panel sigue funcionando con «Actualizar».
      console.error('no se pudo escuchar los cambios en vivo:', causa)
      bus.escuchando = null
    })
}

/** Se suscribe a los cambios de un evento. Devuelve cómo darse de baja. */
export function escucharCambios(eventId: string, oyente: Oyente): () => void {
  asegurarEscucha()
  const oyentes = bus.oyentes.get(eventId) ?? new Set<Oyente>()
  oyentes.add(oyente)
  bus.oyentes.set(eventId, oyentes)
  return () => {
    oyentes.delete(oyente)
    if (oyentes.size === 0) bus.oyentes.delete(eventId)
  }
}
