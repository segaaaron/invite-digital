import { and, asc, eq, sql } from 'drizzle-orm'
import { db } from '@/shared/db/client'
import { designRounds, eventDesign, events } from '@/shared/db/schema'
import { esEstadoDeDiseno, type Diseno, type EstadoDeDiseno } from '../domain/diseno'

export type RondaDeDiseno = { readonly id: string; readonly message: string; readonly counts: boolean; readonly createdAt: Date }
export type DisenoPorEntregar = { readonly slug: string; readonly title: string; readonly estado: EstadoDeDiseno; readonly entregaHasta: string | null }

const aDiseno = (f: typeof eventDesign.$inferSelect): Diseno => {
  if (!esEstadoDeDiseno(f.status)) throw new Error(`El diseño del evento ${f.eventId} tiene un estado desconocido: ${f.status}`)
  return { estado: f.status, rondasIncluidas: f.roundsIncluded, rondasUsadas: f.roundsUsed, diasDeEntrega: f.deliveryDays, entregaHasta: f.dueDate }
}

/**
 * El diseño por encargo en Postgres. Cada cambio de estado se escribe **con el estado de origen
 * en el `where`**: dos clics a la vez (o el cliente y el equipo) no se pisan; el segundo no
 * escribe nada y la pantalla lo dice.
 */
/**
 * Los cambios adicionales (`mas_rondas`) ya comprados antes de que exista el encargo: los de una
 * cotización se aplican al nacer el evento, antes de empezarlo. Con el encargo ya creado, los suma
 * quien aplica el extra; aquí solo se cuentan al crearlo, así que nunca dos veces.
 */
const RONDAS_COMPRADAS = (eventId: string) =>
  sql`select coalesce(sum(amount), 0)::int from event_addons where event_id = ${eventId}::uuid and effect = 'mas_rondas'`

export const drizzleDisenoRepository = {
  async leer(eventId: string): Promise<Diseno | null> {
    const [f] = await db.select().from(eventDesign).where(eq(eventDesign.eventId, eventId)).limit(1)
    return f === undefined ? null : aDiseno(f)
  },

  /** Empieza el encargo con las rondas y los días del plan. Dos veces no duplica ni reinicia. */
  async empezar(eventId: string, plan: { rondas: number; dias: number }): Promise<void> {
    await db.execute(sql`
      insert into event_design (event_id, rounds_included, delivery_days)
      values (${eventId}::uuid, ${plan.rondas} + (${RONDAS_COMPRADAS(eventId)}), ${plan.dias})
      on conflict (event_id) do nothing`)
  },

  /**
   * Empieza el encargo **si el plan es por encargo** (tiene rondas y días), copiándolos en el mismo
   * `insert`. Un plan de autoservicio no crea fila. Devuelve si quedó por encargo.
   */
  async empezarSegunPlan(eventId: string, planSlug: string): Promise<boolean> {
    await db.execute(sql`
      insert into event_design (event_id, rounds_included, delivery_days)
      select ${eventId}::uuid, correction_rounds + (${RONDAS_COMPRADAS(eventId)}), delivery_days from plans
      where slug = ${planSlug} and correction_rounds is not null and delivery_days is not null
      on conflict (event_id) do nothing`)
    return (await this.leer(eventId)) !== null
  },

  /** Escribe el nuevo estado solo si sigue en `desde`. Devuelve si escribió. */
  async cambiar(eventId: string, desde: EstadoDeDiseno, nuevo: Diseno): Promise<boolean> {
    const filas = await db
      .update(eventDesign)
      .set({ status: nuevo.estado, roundsUsed: nuevo.rondasUsadas, dueDate: nuevo.entregaHasta, updatedAt: sql`now()` })
      .where(and(eq(eventDesign.eventId, eventId), eq(eventDesign.status, desde)))
      .returning({ id: eventDesign.eventId })
    return filas.length > 0
  },

  async anotarRonda(eventId: string, mensaje: string, autor: string | null): Promise<void> {
    await db.insert(designRounds).values({ eventId, message: mensaje, createdBy: autor })
  },

  /** Pedir cambios: el estado y su mensaje **en una transacción**. Sin escribir el estado, no queda mensaje. */
  async cambiarConRonda(eventId: string, desde: EstadoDeDiseno, nuevo: Diseno, mensaje: string, autor: string | null): Promise<boolean> {
    return db.transaction(async (tx) => {
      const filas = await tx
        .update(eventDesign)
        .set({ status: nuevo.estado, roundsUsed: nuevo.rondasUsadas, dueDate: nuevo.entregaHasta, updatedAt: sql`now()` })
        .where(and(eq(eventDesign.eventId, eventId), eq(eventDesign.status, desde)))
        .returning({ id: eventDesign.eventId })
      if (filas.length === 0) return false
      await tx.insert(designRounds).values({ eventId, message: mensaje, createdBy: autor })
      return true
    })
  },

  async rondas(eventId: string): Promise<RondaDeDiseno[]> {
    return db
      .select({ id: designRounds.id, message: designRounds.message, counts: designRounds.counts, createdAt: designRounds.createdAt })
      .from(designRounds)
      .where(eq(designRounds.eventId, eventId))
      .orderBy(asc(designRounds.createdAt))
  },

  /** «Error nuestro»: la ronda deja de contar y se devuelve, una sola vez y solo si es de ese evento. */
  async noCuenta(eventId: string, rondaId: string): Promise<boolean> {
    return db.transaction(async (tx) => {
      const marcadas = await tx
        .update(designRounds)
        .set({ counts: false })
        .where(and(eq(designRounds.id, rondaId), eq(designRounds.eventId, eventId), eq(designRounds.counts, true)))
        .returning({ id: designRounds.id })
      if (marcadas.length === 0) return false
      await tx
        .update(eventDesign)
        .set({ roundsUsed: sql`greatest(${eventDesign.roundsUsed} - 1, 0)`, updatedAt: sql`now()` })
        .where(eq(eventDesign.eventId, eventId))
      return true
    })
  },

  /** Lo que el equipo tiene entre manos: esperando datos o en diseño, lo más urgente primero. */
  async porEntregar(): Promise<DisenoPorEntregar[]> {
    const filas = await db
      .select({ slug: events.slug, title: events.title, status: eventDesign.status, due: eventDesign.dueDate })
      .from(eventDesign)
      .innerJoin(events, eq(events.id, eventDesign.eventId))
      .where(sql`${eventDesign.status} in ('esperando_datos', 'en_diseno')`)
      .orderBy(sql`${eventDesign.dueDate} asc nulls last`)
    return filas.flatMap((f) => (esEstadoDeDiseno(f.status) ? [{ slug: f.slug, title: f.title, estado: f.status, entregaHasta: f.due }] : []))
  },
}
