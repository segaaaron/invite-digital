import { createHash } from 'node:crypto'
import { format } from 'node:util'
import { PATHNAME_HEADER } from '@/shared/config/headers'

/**
 * **El registro de fallos** (28 de septiembre). Cada servicio que falla deja aquí qué pasó y por qué —el
 * mensaje, la causa y su pila, la ruta y la acción—, en `service_failures`, que el admin lee en
 * Ajustes › Registro de fallos. Antes todo iba a `console.error`, a la consola del contenedor, y para
 * saber por qué fallaba algo en producción había que adivinar.
 *
 * `registrarFallo` sustituye a `console.error` en el servidor, con **la misma firma más el servicio**:
 * sigue escribiendo en la consola y además guarda la fila, **sin esperar y sin lanzar nunca** —registrar
 * un fallo no puede provocar otro—. En las pruebas no escribe en la base.
 */
export function registrarFallo(servicio: string, mensaje: unknown, ...datos: unknown[]): void {
  console.error(`[${servicio}]`, mensaje, ...datos)
  if (process.env.VITEST !== undefined || !esFalloDelServicio([mensaje, ...datos])) return
  void guardarFallo({ servicio, partes: [mensaje, ...datos] }).catch((causa: unknown) => console.error('[fallos] no se pudo guardar el fallo:', causa))
}

/**
 * **Solo lo que se rompió**, no lo que la persona escribió mal. Un rechazo de validación —«la fecha límite
 * no puede ser posterior al evento», una contraseña equivocada— se queda en la consola: llenaría el
 * registro de ruido y taparía lo que sí hay que arreglar. Es fallo del servicio si trae una excepción, si
 * su clase es de almacenamiento o si el mensaje lo dice («no se pudo», «falló»).
 */
export function esFalloDelServicio(partes: readonly unknown[]): boolean {
  if (partes.some((p) => p instanceof Error)) return true
  const texto = partes.filter((p) => typeof p === 'string').join(' ')
  return /storage_failure|failure|no se pud|fall[óo] |error|timeout|no respond/i.test(texto)
}

/** Lo que no es un fallo aunque llegue como excepción: el navegador cortó la carga al irse a otra página. */
export const esCorteDelCliente = (error: unknown): boolean =>
  error instanceof Error && /destination stream closed early|aborted|ECONNRESET|EPIPE/i.test(`${error.name} ${error.message}`)

const MAX_MENSAJE = 500
const MAX_DETALLE = 8000

/** El primer `Error` de lo que se registró, bajando por `cause`: es el que trae la pila. */
function primerError(partes: readonly unknown[]): Error | null {
  for (const parte of partes) if (parte instanceof Error) return parte
  return null
}

function detalleDe(error: Error | null, partes: readonly unknown[]): string {
  const bloques: string[] = []
  let actual: unknown = error
  for (let i = 0; actual instanceof Error && i < 4; i++) {
    bloques.push(actual.stack ?? `${actual.name}: ${actual.message}`)
    actual = actual.cause
  }
  // Lo que no es un Error también cuenta: `{ kind, detail }` de un Result dice exactamente por qué.
  const resto = partes.filter((p) => !(p instanceof Error) && typeof p === 'object' && p !== null)
  if (resto.length > 0) bloques.push(format('%O', ...resto))
  return bloques.join('\n\ncausado por: ').slice(0, MAX_DETALLE)
}

/** Lo que agrupa dos fallos iguales: servicio y mensaje sin números, identificadores ni correos. */
export function huellaDe(servicio: string, mensaje: string): string {
  const normal = mensaje
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<id>')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '<correo>')
    .replace(/\d+/g, '<n>')
  return createHash('sha256').update(`${servicio}\u0000${normal}`).digest('hex').slice(0, 16)
}

/** La ruta y la acción de la petición en curso, si la hay (fuera de una petición no hay nada que leer). */
async function contexto(): Promise<{ path: string | null; action: string | null }> {
  try {
    const { headers } = await import('next/headers')
    const h = await headers()
    return { path: h.get(PATHNAME_HEADER) ?? h.get('referer'), action: h.get('next-action') }
  } catch {
    return { path: null, action: null }
  }
}

export async function guardarFallo(entrada: {
  servicio: string
  partes: readonly unknown[]
  origen?: 'servidor' | 'navegador'
  ruta?: string | null
  accion?: string | null
}): Promise<void> {
  const error = primerError(entrada.partes)
  // Como `console.error`: el primer texto con sus `%s` rellenados por lo simple que viene detrás, y el
  // mensaje del error al final. Los objetos van al detalle.
  const [primero, ...resto] = entrada.partes
  const simples = resto.filter((p) => typeof p !== 'object' || p === null)
  const base = typeof primero === 'string' ? format(primero, ...simples) : ''
  const mensaje = ([base, error?.message].filter(Boolean).join(' ') || 'Fallo sin mensaje').replace(/\s+/g, ' ').slice(0, MAX_MENSAJE)
  const donde = entrada.ruta === undefined ? await contexto() : { path: entrada.ruta, action: entrada.accion ?? null }
  const { db } = await import('@/shared/db/client')
  const { serviceFailures } = await import('@/shared/db/schema')
  await db.insert(serviceFailures).values({
    service: entrada.servicio.slice(0, 160),
    message: mensaje,
    detail: detalleDe(error, entrada.partes),
    fingerprint: huellaDe(entrada.servicio, mensaje),
    origin: entrada.origen ?? 'servidor',
    path: donde.path?.slice(0, 400) ?? null,
    action: donde.action?.slice(0, 120) ?? null,
  })
}
