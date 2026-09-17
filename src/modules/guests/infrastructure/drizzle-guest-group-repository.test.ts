import { describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { eq } from 'drizzle-orm'
import { events, guestGroups } from '@/shared/db/schema'
import { createTokenMinter } from '@/shared/security/tokens'
import { countGroupsByEvent, createDrizzleGuestGroupRepository } from './drizzle-guest-group-repository'

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

const seedEvent = async (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => {
  const [row] = await tx
    .insert(events)
    .values({
      slug: `repo-${crypto.randomUUID().slice(0, 8)}`,
      title: 'Evento de prueba',
      eventDate: '2026-12-05',
      rsvpDeadline: '2026-11-20',
      locale: 'es',
      themeKey: 'clasico',
      status: 'live',
    })
    .returning({ id: events.id })
  return row!.id
}

describe('repositorio de grupos', () => {
  it('inserta, lista por evento y encuentra por hash', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleGuestGroupRepository(tx)
      const minter = createTokenMinter()
      const eventId = await seedEvent(tx)

      const primero = minter.mint()
      const segundo = minter.mint()
      await repo.insert({ id: crypto.randomUUID(), eventId, label: 'Familia Rojas', seats: 4, revokedAt: null, invitationSentAt: null, phone: null, createdAt: new Date(0) }, primero.hash, primero.token)
      await repo.insert({ id: crypto.randomUUID(), eventId, label: 'Daniela Ortiz', seats: 1, revokedAt: null, invitationSentAt: null, phone: null, createdAt: new Date(0) }, segundo.hash, segundo.token)

      expect((await repo.listByEvent(eventId)).map((row) => row.label)).toEqual(['Familia Rojas', 'Daniela Ortiz'])
      // La insignia de la barra: el mismo número que la lista, sin traerla.
      expect(await countGroupsByEvent(tx, eventId)).toBe(2)
      expect((await repo.findByTokenHash(minter.hashOf(primero.token)))?.label).toBe('Familia Rojas')
      // El enlace se vuelve a enseñar: el token se guarda cifrado y se abre por evento.
      expect([...(await repo.tokensOf(eventId)).values()].sort()).toEqual([primero.token, segundo.token].sort())
      expect(await repo.findByTokenHash(Buffer.alloc(32, 255))).toBeNull()
    })
  })

  /**
   * Una invitación de antes de `0062` no guardó su token: el panel no puede enseñar su enlace, y
   * rotarlo dejaría fuera al invitado que ya tiene el suyo en el chat. `adoptToken` le da uno nuevo
   * **conservando el viejo**: los dos abren la misma invitación.
   */
  it('adoptar un enlace deja vivos los dos, y no toca la que ya tenía el suyo guardado', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleGuestGroupRepository(tx)
      const minter = createTokenMinter()
      const eventId = await seedEvent(tx)

      const id = crypto.randomUUID()
      const viejo = minter.mint()
      await repo.insert({ id, eventId, label: 'Familia Rojas', seats: 4, revokedAt: null, invitationSentAt: null, phone: null, createdAt: new Date(0) }, viejo.hash, viejo.token)
      // Como las de antes de `0062`: con hash y sin token guardado.
      await tx.update(guestGroups).set({ tokenSealed: null }).where(eq(guestGroups.id, id))
      expect((await repo.tokensOf(eventId)).get(id)).toBeUndefined()

      const nuevo = minter.mint()
      await repo.adoptToken(eventId, id, nuevo.hash, nuevo.token)

      expect((await repo.tokensOf(eventId)).get(id)).toBe(nuevo.token)
      expect((await repo.findByTokenHash(minter.hashOf(nuevo.token)))?.id).toBe(id)
      // Lo que importa: el enlace que ya circula por el chat sigue abriendo.
      expect((await repo.findByTokenHash(minter.hashOf(viejo.token)))?.id).toBe(id)

      // Sobre una que sí tiene su enlace guardado, adoptar no hace nada.
      const otro = minter.mint()
      await repo.adoptToken(eventId, id, otro.hash, otro.token)
      expect((await repo.tokensOf(eventId)).get(id)).toBe(nuevo.token)
      expect(await repo.findByTokenHash(minter.hashOf(otro.token))).toBeNull()
    })
  })

  it('revoca sin borrar y marca la apertura una sola vez', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleGuestGroupRepository(tx)
      const minter = createTokenMinter()
      const eventId = await seedEvent(tx)
      const id = crypto.randomUUID()
      const { hash, token } = minter.mint()

      await repo.insert({ id, eventId, label: 'Familia Rojas', seats: 4, revokedAt: null, invitationSentAt: null, phone: null, createdAt: new Date(0) }, hash, token)

      const primera = new Date('2026-08-19T12:00:00Z')
      await repo.markOpened(id, primera)
      await repo.markOpened(id, new Date('2026-08-20T12:00:00Z'))
      expect((await repo.findByTokenHash(hash))?.openedAt?.toISOString()).toBe(primera.toISOString())

      await repo.revoke(eventId, id, new Date('2026-08-21T12:00:00Z'))
      const revocado = await repo.findByTokenHash(hash)
      expect(revocado).not.toBeNull()
      expect(revocado?.revokedAt).not.toBeNull()
    })
  })

  it('ninguna escritura por identificador toca la invitación de otro evento', async () => {
    // El identificador llega del navegador y el evento de la guardia. Con el evento de otra
    // boda, la fila tiene que quedar exactamente como estaba.
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleGuestGroupRepository(tx)
      const minter = createTokenMinter()
      const suyo = await seedEvent(tx)
      const ajeno = await seedEvent(tx)
      const id = crypto.randomUUID()
      const { hash, token } = minter.mint()
      await repo.insert({ id, eventId: suyo, label: 'Ana', seats: 1, revokedAt: null, invitationSentAt: null, phone: null, createdAt: new Date(0) }, hash, token)
      const cuando = new Date('2026-09-16T12:00:00Z')

      expect(await repo.findById(ajeno, id)).toBeNull()
      await repo.revoke(ajeno, id, cuando)
      await repo.markSent(ajeno, id, cuando)
      const otro = minter.mint()
      await repo.replaceToken(ajeno, id, otro.hash, otro.token)
      await repo.setPhone(ajeno, id, '+59170000000')
      await repo.reopenRsvp(ajeno, id, cuando)
      await repo.setSeats(ajeno, id, 9)
      await repo.setLabel(ajeno, id, 'Intruso')
      await repo.remove(ajeno, id)

      const intacta = await repo.findById(suyo, id)
      expect(intacta).toMatchObject({ label: 'Ana', seats: 1, revokedAt: null, invitationSentAt: null, phone: null })
      expect((await repo.findByTokenHash(hash))?.id).toBe(id)

      await repo.setSeats(suyo, id, 3)
      await repo.setLabel(suyo, id, 'Ana Vega')
      expect(await repo.findById(suyo, id)).toMatchObject({ label: 'Ana Vega', seats: 3 })
      await repo.remove(suyo, id)
      expect(await repo.findById(suyo, id)).toBeNull()
    })
  })
})
