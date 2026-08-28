import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { db } from './client'
import { eventContent, events } from './schema'

class RollbackForTest extends Error {}

async function inRolledBackTransaction(run: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<void>) {
  try {
    await db.transaction(async (tx) => {
      await run(tx)
      throw new RollbackForTest()
    })
  } catch (error) {
    if (!(error instanceof RollbackForTest)) throw error
  }
}

const evento = (slug: string) => ({
  slug,
  title: `Evento ${slug}`,
  eventDate: '2026-12-05',
  rsvpDeadline: '2026-11-20',
  locale: 'es',
  themeKey: 'boda-bot',
  status: 'live',
})

describe('esquema de event_content', () => {
  it('cae en cascada al borrar el evento', async () => {
    // El contenido no significa nada sin su evento, igual que una pertenencia de puerta.
    // Lo que nunca cae en cascada son los datos con valor propio.
    await inRolledBackTransaction(async (tx) => {
      const [fila] = await tx.insert(events).values(evento('boda-cascada')).returning({ id: events.id })
      await tx.insert(eventContent).values({ eventId: fila!.id, blocks: { quote: { text: 'Hola' } } })

      await tx.delete(events).where(eq(events.id, fila!.id))

      const quedan = await tx.select().from(eventContent).where(eq(eventContent.eventId, fila!.id))
      expect(quedan).toHaveLength(0)
    })
  })

  it('admite un solo contenido por evento', async () => {
    await inRolledBackTransaction(async (tx) => {
      const [fila] = await tx.insert(events).values(evento('boda-unico')).returning({ id: events.id })
      await tx.insert(eventContent).values({ eventId: fila!.id, blocks: {} })

      await expect(tx.insert(eventContent).values({ eventId: fila!.id, blocks: {} })).rejects.toThrow()
    })
  })

  it('conserva acentos, saltos de línea y listas dentro del jsonb', async () => {
    await inRolledBackTransaction(async (tx) => {
      const [fila] = await tx.insert(events).values(evento('boda-jsonb')).returning({ id: events.id })
      const blocks = {
        quote: { text: 'Que nunca dejes de soñar,\ny que cada sueño te encuentre preparada.' },
        itinerary: [
          { time: '18:00', label: 'Recepción' },
          { time: '23:00', label: 'Baile Sorpresa' },
        ],
      }
      await tx.insert(eventContent).values({ eventId: fila!.id, blocks })

      const [leido] = await tx.select().from(eventContent).where(eq(eventContent.eventId, fila!.id))
      expect(leido!.blocks).toEqual(blocks)
    })
  })

  it('arranca con un objeto vacío y no con nulo', async () => {
    // Un `null` obligaría a cada lectura a distinguir «sin fila» de «fila sin bloques»,
    // que para el diseño son lo mismo.
    await inRolledBackTransaction(async (tx) => {
      const [fila] = await tx.insert(events).values(evento('boda-defecto')).returning({ id: events.id })
      await tx.insert(eventContent).values({ eventId: fila!.id })

      const [leido] = await tx.select().from(eventContent).where(eq(eventContent.eventId, fila!.id))
      expect(leido!.blocks).toEqual({})
    })
  })
})
