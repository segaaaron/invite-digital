import { describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { doorPorters, vendors, events, guestGroups, sessions, users } from '@/shared/db/schema'
import { createTokenMinter } from '@/shared/security/tokens'
import { isOk } from '@/shared/result'
import { addGuestGroup } from '../application/add-guest-group'
import { createDrizzleGuestGroupRepository } from './drizzle-guest-group-repository'

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

/**
 * La afirmación que exige la sección 9 del spec: el token en claro no vive en la base.
 * Se vuelca la tabla entera y se busca el token dentro, no solo en la columna que
 * debería tenerlo — un descuido futuro que lo copiara a `label` caería aquí.
 */
describe('el token no se guarda en claro', () => {
  it('no aparece en ninguna columna de guest_groups', async () => {
    await inRolledBackTransaction(async (tx) => {
      const [event] = await tx
        .insert(events)
        .values({
          slug: `token-${crypto.randomUUID().slice(0, 8)}`,
          title: 'Evento de prueba',
          eventDate: '2027-05-15',
          rsvpDeadline: '2027-05-01',
          locale: 'es',
          themeKey: 'clasico',
          status: 'live',
        })
        .returning({ id: events.id })

      const result = await addGuestGroup({
        groups: createDrizzleGuestGroupRepository(tx),
        minter: createTokenMinter(),
        ids: () => crypto.randomUUID(),
        clock: () => new Date('2026-08-24T12:00:00Z'),
      })({
        eventId: event!.id,
        label: 'Familia Rojas Peña',
        seats: 4,
        // Esta prueba vigila que el token en claro no toque la base; el plan no le
        // incumbe. Sin límite para que llegue a insertar, que es lo que quiere mirar.
        allowance: { maxGuestGroups: null },
        currentGroups: 0,
      })

      if (!isOk(result)) throw new Error(`el alta falló: ${result.error.detail}`)
      const { token } = result.value

      const filas = await tx.select().from(guestGroups)
      const volcado = JSON.stringify(filas)

      expect(volcado.length).toBeGreaterThan(0)
      expect(volcado).toContain('Familia Rojas Peña')
      expect(volcado).not.toContain(token)
    })
  })

  it('las tablas con token guardan bytea y nunca texto', async () => {
    const columnas = [
      { tabla: 'guest_groups', columna: guestGroups.tokenHash },
      { tabla: 'sessions', columna: sessions.tokenHash },
      { tabla: 'door_porters', columna: doorPorters.tokenHash },
      { tabla: 'vendors', columna: vendors.accessTokenHash },
    ] as const

    // Si alguien cambiara `token_hash` a `text` para "poder leerlo", el tipo dejaría de
    // ser bytea y esta prueba lo diría.
    const tipos = await db.execute<{ table_name: string; data_type: string }>(
      `select table_name, data_type from information_schema.columns where column_name in ('token_hash', 'access_token_hash')`,
    )

    expect(tipos.map((fila) => fila.table_name).sort()).toEqual(columnas.map((c) => c.tabla).sort())
    expect(tipos.every((fila) => fila.data_type === 'bytea')).toBe(true)
  })

  it('la contraseña del atelier se guarda como hash Argon2id, nunca en claro', async () => {
    const filas = await db.select({ passwordHash: users.passwordHash }).from(users)
    for (const fila of filas) {
      expect(fila.passwordHash.startsWith('$argon2id$')).toBe(true)
    }
  })
})
