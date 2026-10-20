import { describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { createDrizzleEventRepository, publicarSiBorrador } from './drizzle-event-repository'

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
  userId: null,
  slug,
  title: `Evento ${slug}`,
  eventDate: '2026-12-05',
  rsvpDeadline: '2026-11-20',
  locale: 'es' as const,
  themeKey: 'clasico',
  status: 'draft' as const,
  retentionDays: 90, currency: 'BOB' as const, messageTemplate: null, venue: null, demoUntil: null,
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

  it('publicar solo pasa de borrador a publicado: uno cerrado no se reabre', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleEventRepository(tx)
      const borrador = evento('boda-borrador')
      const cerrado = { ...evento('boda-cerrada'), status: 'closed' as const }
      await repo.insert(borrador)
      await repo.insert(cerrado)

      await publicarSiBorrador(tx, borrador.id)
      await publicarSiBorrador(tx, cerrado.id)

      expect((await repo.findById(borrador.id))?.status).toBe('live')
      expect((await repo.findById(cerrado.id))?.status).toBe('closed')
    })
  })
})

/**
 * **Las demos no son eventos** (0099). El filtro vive en la consulta —`listAll` y `listByUser`— y no en las
 * pantallas: una demo colada en la cartera acaba en un informe de ingresos, y ahí ya no se ve que era
 * de mentira.
 */
describe('las demos de un día, aparte de la cartera', () => {
  const demo = (slug: string, demoUntil: Date) => ({ ...evento(slug), demoUntil, userId: null })

  it('no salen en la cartera, ni en la del atelier, y sí en su propia lista', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleEventRepository(tx)
      const boda = evento('boda-vendida')
      await repo.insert(boda)
      await repo.insert(demo('demo-de-prueba', new Date('2026-10-21T18:00:00Z')))

      const cartera = await repo.listAll()
      expect(cartera.map((e) => e.slug)).toContain('boda-vendida')
      expect(cartera.map((e) => e.slug)).not.toContain('demo-de-prueba')

      const demos = await repo.listDemos()
      expect(demos.map((e) => e.slug)).toEqual(['demo-de-prueba'])
      expect(demos[0]?.demoUntil).toBeInstanceOf(Date)
    })
  })

  it('la retención no las toca: se borran enteras, no se anonimizan', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleEventRepository(tx)
      // Fecha pasada y retención cumplida: una boda así sí entraría a anonimizarse.
      const vieja = { ...evento('demo-vieja'), eventDate: '2020-01-01', rsvpDeadline: '2019-12-01', demoUntil: new Date('2020-01-02T00:00:00Z') }
      await repo.insert(vieja)

      const pendientes = await repo.listPendingAnonymization(new Date('2026-10-20T12:00:00Z'))
      expect(pendientes.map((e) => e.slug)).not.toContain('demo-vieja')
    })
  })
})
