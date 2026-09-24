import { desc, or, sql, type SQL, type AnyColumn } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { consultationRequests, events, orders, users } from '@/shared/db/schema'
import { patronDeBusqueda, SIN_RESULTADOS, type ResultadosDeBusqueda } from '../domain/busqueda'

/** Cuántos por grupo: es para encontrar uno, no para listar. */

const TOPE = 8

/** `ILIKE` sin tildes a los dos lados (`0069`): «lucia» encuentra «Lucía». */
const parecido = (columna: AnyColumn, patron: string): SQL => sql`unaccent(${columna}::text) ilike unaccent(${patron})`

/**
 * La búsqueda del admin en todo: eventos (título, enlace), pedidos (referencia, nombre,
 * contacto), consultas (nombre, correo, teléfono) y usuarios (correo). Cuatro consultas
 * acotadas, en paralelo. Solo la llama una página tras `requireAdmin()`.
 */
export const createDrizzleBuscador = (database: DbExecutor) => async (texto: string): Promise<ResultadosDeBusqueda> => {
  const p = patronDeBusqueda(texto)
  if (p === null) return SIN_RESULTADOS
  const [eventos, pedidos, consultas, usuarios] = await Promise.all([
    database
      .select({ slug: events.slug, title: events.title, eventDate: events.eventDate })
      .from(events)
      .where(or(parecido(events.title, p), parecido(events.slug, p)))
      .orderBy(desc(events.eventDate))
      .limit(TOPE),
    database
      .select({ ref: orders.publicRef, customerName: orders.customerName, status: orders.status })
      .from(orders)
      .where(or(parecido(orders.publicRef, p), parecido(orders.customerName, p), parecido(orders.contact, p)))
      .orderBy(desc(orders.createdAt))
      .limit(TOPE),
    database
      .select({ id: consultationRequests.id, name: consultationRequests.name, status: consultationRequests.status })
      .from(consultationRequests)
      .where(or(parecido(consultationRequests.name, p), parecido(consultationRequests.email, p), parecido(consultationRequests.phone, p)))
      .orderBy(desc(consultationRequests.createdAt))
      .limit(TOPE),
    database.select({ email: users.email, role: users.role }).from(users).where(parecido(users.email, p)).orderBy(users.email).limit(TOPE),
  ])
  return { eventos, pedidos, consultas, usuarios }
}

export const drizzleBuscador = createDrizzleBuscador(db)
