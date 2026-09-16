import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import { db } from './client'
import { events } from './schema'
import { enTransaccion } from './transaccion'

/**
 * Los casos de uso no lanzan: devuelven el error como valor. Una transacción de Drizzle solo
 * se deshace si algo lanza, así que sin este ayudante un caso de uso que escribe dos filas y
 * devuelve error en la segunda dejaba la primera guardada.
 */
const evento = (id: string) => ({
  id,
  slug: `tx-${id.slice(0, 8)}`,
  title: 'Transacción',
  eventDate: '2027-05-15',
  rsvpDeadline: '2027-05-01',
  locale: 'es' as const,
  themeKey: 'clasico',
  status: 'draft' as const,
})

describe('enTransaccion', () => {
  it('con un error devuelto, deshace lo escrito y devuelve ese error', async () => {
    const id = crypto.randomUUID()
    const r = await enTransaccion(async (tx) => {
      await tx.insert(events).values(evento(id))
      return err('no cabe')
    })

    expect(isErr(r) && r.error).toBe('no cabe')
    expect(await db.select().from(events).where(eq(events.id, id))).toHaveLength(0)
  })

  it('con éxito, lo escrito se queda', async () => {
    const id = crypto.randomUUID()
    const r = await enTransaccion(async (tx) => {
      await tx.insert(events).values(evento(id))
      return ok(id)
    })

    expect(isOk(r)).toBe(true)
    expect(await db.select().from(events).where(eq(events.id, id))).toHaveLength(1)
    await db.delete(events).where(eq(events.id, id))
  })
})
