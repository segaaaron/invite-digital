import { and, desc, eq, gte, lt, sql } from 'drizzle-orm'
import { db } from '@/shared/db/client'
import { serviceFailures } from '@/shared/db/schema'

export type TipoDeFallo = {
  readonly huella: string
  readonly servicio: string
  readonly mensaje: string
  readonly origen: string
  readonly veces: number
  readonly primero: Date
  readonly ultimo: Date
  /** La última vez que pasó, entera: la causa, la ruta y la acción. */
  readonly detalle: string
  readonly ruta: string | null
  readonly accion: string | null
}

/**
 * Los fallos de los últimos `dias`, **agrupados por tipo** (la huella): cuántas veces, cuándo el primero y
 * el último, y el detalle del último. Del más reciente al más viejo. `origen` filtra servidor o navegador.
 */
export async function tiposDeFallo(dias: number, origen: 'servidor' | 'navegador' | null, limite = 100): Promise<TipoDeFallo[]> {
  const desde = new Date(Date.now() - dias * 86_400_000)
  const filtro = and(gte(serviceFailures.createdAt, desde), origen === null ? undefined : eq(serviceFailures.origin, origen))
  const grupos = await db
    .select({
      huella: serviceFailures.fingerprint,
      veces: sql<number>`count(*)::int`,
      primero: sql<Date>`min(${serviceFailures.createdAt})`,
      ultimo: sql<Date>`max(${serviceFailures.createdAt})`,
    })
    .from(serviceFailures)
    .where(filtro)
    .groupBy(serviceFailures.fingerprint)
    .orderBy(desc(sql`max(${serviceFailures.createdAt})`))
    .limit(limite)
  if (grupos.length === 0) return []
  // El último de cada tipo, en una consulta: `distinct on` por huella.
  const ultimos = (await db.execute(sql`
    select distinct on (fingerprint) fingerprint, service, message, origin, detail, path, action
    from service_failures
    where created_at >= ${desde.toISOString()}::timestamptz and fingerprint in ${sql.raw(`(${grupos.map((g) => `'${g.huella.replace(/[^0-9a-f]/g, '')}'`).join(',')})`)}
    order by fingerprint, created_at desc
  `)) as unknown as { fingerprint: string; service: string; message: string; origin: string; detail: string; path: string | null; action: string | null }[]
  const porHuella = new Map(ultimos.map((u) => [u.fingerprint, u]))
  return grupos.flatMap((g) => {
    const u = porHuella.get(g.huella)
    return u === undefined
      ? []
      : [{ huella: g.huella, servicio: u.service, mensaje: u.message, origen: u.origin, veces: g.veces, primero: new Date(g.primero), ultimo: new Date(g.ultimo), detalle: u.detail, ruta: u.path, accion: u.action }]
  })
}

/** Borra un tipo de fallo entero (ya arreglado). Devuelve cuántas filas. */
export async function borrarTipoDeFallo(huella: string): Promise<number> {
  const borradas = await db.delete(serviceFailures).where(eq(serviceFailures.fingerprint, huella)).returning({ id: serviceFailures.id })
  return borradas.length
}

/** La retención: lo de más de 30 días se va (`pnpm maintenance`). */
export async function borrarFallosViejos(ahora: Date): Promise<number> {
  const borradas = await db
    .delete(serviceFailures)
    .where(lt(serviceFailures.createdAt, new Date(ahora.getTime() - 30 * 86_400_000)))
    .returning({ id: serviceFailures.id })
  return borradas.length
}
