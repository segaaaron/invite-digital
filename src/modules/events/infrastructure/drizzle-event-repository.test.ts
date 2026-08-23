import { describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { createDrizzleEventRepository } from './drizzle-event-repository'

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
  id: crypto.randomUUID(),
  slug,
  title: `Evento ${slug}`,
  eventDate: '2026-12-05',
  rsvpDeadline: '2026-11-20',
  locale: 'es' as const,
  themeKey: 'clasico',
  status: 'draft' as const,
  retentionDays: 90, currency: 'BOB' as const, messageTemplate: null,
})

describe('repositorio de eventos', () => {
  it('inserta, encuentra por slug y por id, y actualiza', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleEventRepository(tx)
      const uno = evento('boda-repo')

      await repo.insert(uno)
      expect((await repo.findBySlug('boda-repo'))?.title).toBe('Evento boda-repo')
      expect((await repo.findById(uno.id))?.slug).toBe('boda-repo')

      await repo.update({ ...uno, status: 'live', title: 'Título nuevo' })
      const actualizado = await repo.findBySlug('boda-repo')
      expect(actualizado?.status).toBe('live')
      expect(actualizado?.title).toBe('Título nuevo')

      expect(await repo.findBySlug('no-existe')).toBeNull()
    })
  })

  it('devuelve las fechas como texto ISO, no como Date', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleEventRepository(tx)
      await repo.insert(evento('fechas'))
      const fila = await repo.findBySlug('fechas')
      expect(fila?.eventDate).toBe('2026-12-05')
      expect(fila?.rsvpDeadline).toBe('2026-11-20')
    })
  })

  it('lista los eventos ordenados por fecha', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleEventRepository(tx)
      await repo.insert({ ...evento('tarde'), eventDate: '2027-01-10', rsvpDeadline: '2026-12-01' })
      await repo.insert({ ...evento('pronto'), eventDate: '2026-09-01', rsvpDeadline: '2026-08-25' })

      const slugs = (await repo.listAll()).map((row) => row.slug)
      expect(slugs.indexOf('pronto')).toBeLessThan(slugs.indexOf('tarde'))
    })
  })
})
