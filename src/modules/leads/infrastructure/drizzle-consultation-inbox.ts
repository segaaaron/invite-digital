import { and, count, desc, eq, lt, ne, or, isNotNull } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { consultationRequests, eventCategories, events } from '@/shared/db/schema'
import { ESTADOS_CONSULTA, NOMBRE_ANONIMO, parseEstado, type EstadoConsulta } from '../domain/pipeline'
import type { ConsultationInbox, ConsultationRow } from '../application/ports'

/** Tope de la bandeja. Una bandeja de quinientas consultas ya no se lee: se filtra. */
const MAXIMO = 500

const columnas = {
  id: consultationRequests.id,
  name: consultationRequests.name,
  email: consultationRequests.email,
  phone: consultationRequests.phone,
  categorySlug: eventCategories.slug,
  eventDate: consultationRequests.eventDate,
  message: consultationRequests.message,
  locale: consultationRequests.locale,
  status: consultationRequests.status,
  note: consultationRequests.note,
  statusChangedAt: consultationRequests.statusChangedAt,
  eventSlug: events.slug,
  eventTitle: events.title,
  createdAt: consultationRequests.createdAt,
}

type Fila = { [K in keyof typeof columnas]: (typeof columnas)[K]['_']['data'] | null } & { id: string; name: string; locale: string; status: string; createdAt: Date }

const aFila = (f: Fila): ConsultationRow => ({
  id: f.id,
  name: f.name,
  email: f.email,
  phone: f.phone,
  categorySlug: f.categorySlug,
  eventDate: f.eventDate,
  message: f.message,
  locale: f.locale,
  status: parseEstado(f.status),
  note: f.note,
  statusChangedAt: f.statusChangedAt,
  event: f.eventSlug !== null && f.eventTitle !== null ? { slug: f.eventSlug, title: f.eventTitle } : null,
  createdAt: f.createdAt,
})

export const createDrizzleConsultationInbox = (database: DbExecutor): ConsultationInbox => {
  // `leftJoin` en los dos: una consulta sin categoría o sin boda es la mayoría, y con
  // `innerJoin` la bandeja saldría vacía sin un solo error.
  const base = () =>
    database
      .select(columnas)
      .from(consultationRequests)
      .leftJoin(eventCategories, eq(eventCategories.id, consultationRequests.categoryId))
      .leftJoin(events, eq(events.id, consultationRequests.eventId))

  return {
    async list(estado) {
      const consulta = base()
      const filas = await (estado === null ? consulta : consulta.where(eq(consultationRequests.status, estado)))
        .orderBy(desc(consultationRequests.createdAt))
        .limit(MAXIMO)
      return filas.map(aFila)
    },

    async counts() {
      const filas = await database
        .select({ status: consultationRequests.status, total: count() })
        .from(consultationRequests)
        .groupBy(consultationRequests.status)
      const conteo = Object.fromEntries(ESTADOS_CONSULTA.map((e) => [e, 0])) as Record<EstadoConsulta, number>
      for (const fila of filas) conteo[parseEstado(fila.status)] += fila.total
      return conteo
    },

    async find(id) {
      const [fila] = await base().where(eq(consultationRequests.id, id)).limit(1)
      return fila === undefined ? null : aFila(fila)
    },

    async move(id, from, patch) {
      const escritas = await database
        .update(consultationRequests)
        .set({ status: patch.status, note: patch.note, eventId: patch.eventId, statusChangedAt: patch.at })
        .where(and(eq(consultationRequests.id, id), eq(consultationRequests.status, from)))
        .returning({ id: consultationRequests.id })
      return escritas.length > 0
    },

    async countNew() {
      const [fila] = await database
        .select({ total: count() })
        .from(consultationRequests)
        .where(eq(consultationRequests.status, 'new'))
      return fila?.total ?? 0
    },

    async anonymizeBefore(antesDe) {
      // Idempotente sin columna nueva: una ya anonimizada no cumple ninguna de las cinco
      // condiciones del `or` y no se vuelve a tocar.
      const hechas = await database
        .update(consultationRequests)
        .set({ name: NOMBRE_ANONIMO, email: null, phone: null, message: null, note: null, utm: null })
        .where(
          and(
            lt(consultationRequests.createdAt, antesDe),
            or(
              ne(consultationRequests.name, NOMBRE_ANONIMO),
              isNotNull(consultationRequests.email),
              isNotNull(consultationRequests.phone),
              isNotNull(consultationRequests.message),
              isNotNull(consultationRequests.note),
            ),
          ),
        )
        .returning({ id: consultationRequests.id })
      return hechas.length
    },
  }
}

export const drizzleConsultationInbox = createDrizzleConsultationInbox(db)
