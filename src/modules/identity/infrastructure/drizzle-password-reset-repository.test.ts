import { describe, expect, it } from 'vitest'
import { sql } from 'drizzle-orm'
import { db } from '@/shared/db/client'
import { users } from '@/shared/db/schema'
import { MAX_CODIGOS_POR_VENTANA, MAX_FALLOS_POR_VENTANA, MAX_OTP_ATTEMPTS, VENTANA_DE_CUENTA_MS } from '../domain/password-reset'
import { createDrizzlePasswordResetRepository } from './drizzle-password-reset-repository'

/**
 * Los topes de la recuperación **contra Postgres de verdad** (F2/F7/F8 del escaneo del 19 oct): son
 * una sentencia cada uno, así que probarlos con un doble no probaría nada de lo que importa.
 *
 * Cada prueba vive en su transacción, que se deshace al final.
 */
class DeshacerLaPrueba extends Error {}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function enTransaccionDeshecha(correr: (tx: Tx) => Promise<void>) {
  try {
    await db.transaction(async (tx) => {
      await correr(tx)
      throw new DeshacerLaPrueba()
    })
  } catch (error) {
    if (!(error instanceof DeshacerLaPrueba)) throw error
  }
}

const sembrarUsuario = async (tx: Tx) => {
  const [fila] = await tx
    .insert(users)
    .values({ email: `reset-${crypto.randomUUID().slice(0, 8)}@ejemplo.bo`, passwordHash: 'x'.repeat(20) })
    .returning({ id: users.id })
  return fila!.id
}

const AHORA = new Date('2026-10-20T15:00:00Z')
const codigo = (n: number) => Buffer.from(`hash-del-codigo-${n}`)

describe('repositorio del código de recuperación', () => {
  it('emite hasta el tope de la cuenta por hora y luego dice «demasiados»', async () => {
    await enTransaccionDeshecha(async (tx) => {
      const repo = createDrizzlePasswordResetRepository(tx)
      const userId = await sembrarUsuario(tx)

      for (let i = 0; i < MAX_CODIGOS_POR_VENTANA; i += 1) {
        const r = await repo.issue({ userId, codeHash: codigo(i), expiresAt: new Date(AHORA.getTime() + 600_000), now: AHORA })
        expect(r).toBe('emitido')
      }

      expect(await repo.issue({ userId, codeHash: codigo(99), expiresAt: new Date(AHORA.getTime() + 600_000), now: AHORA })).toBe('demasiados')
    })
  })

  it('pasada la ventana vuelve a emitir: el tope es por hora, no para siempre', async () => {
    await enTransaccionDeshecha(async (tx) => {
      const repo = createDrizzlePasswordResetRepository(tx)
      const userId = await sembrarUsuario(tx)
      const expira = new Date(AHORA.getTime() + 600_000)

      for (let i = 0; i < MAX_CODIGOS_POR_VENTANA; i += 1) await repo.issue({ userId, codeHash: codigo(i), expiresAt: expira, now: AHORA })
      expect(await repo.issue({ userId, codeHash: codigo(99), expiresAt: expira, now: AHORA })).toBe('demasiados')

      const despues = new Date(AHORA.getTime() + VENTANA_DE_CUENTA_MS + 1000)
      expect(await repo.issue({ userId, codeHash: codigo(100), expiresAt: new Date(despues.getTime() + 600_000), now: despues })).toBe('emitido')
    })
  })

  it('los fallos de la cuenta sobreviven a pedir otro código: es el agujero que cerró la 0097', async () => {
    await enTransaccionDeshecha(async (tx) => {
      const repo = createDrizzlePasswordResetRepository(tx)
      const userId = await sembrarUsuario(tx)
      const expira = new Date(AHORA.getTime() + 600_000)

      // Se gastan los intentos de la cuenta pidiendo códigos nuevos cada vez que se agotan los del código.
      let fallos = 0
      for (let vuelta = 0; vuelta < MAX_CODIGOS_POR_VENTANA; vuelta += 1) {
        await repo.issue({ userId, codeHash: codigo(vuelta), expiresAt: expira, now: AHORA })
        for (let i = 0; i < MAX_OTP_ATTEMPTS; i += 1) {
          if ((await repo.cobrarIntento(userId, AHORA)).estado === 'cobrado') fallos += 1
        }
      }

      // Antes: cinco por código sin techo. Ahora: el techo de la cuenta, y lo demás no cuenta.
      expect(fallos).toBe(MAX_FALLOS_POR_VENTANA)
      // Y se distingue de «no hay código»: con el cupo agotado, pedir otro no sirve y la pantalla
      // tiene que decir cuándo se abre, no «pide uno nuevo» (que es lo que decía).
      expect(await repo.cobrarIntento(userId, AHORA)).toEqual({ estado: 'sin_intentos', hasta: new Date(AHORA.getTime() + VENTANA_DE_CUENTA_MS) })
    })
  })

  it('no deja pasar más intentos de los del código aunque lleguen a la vez', async () => {
    await enTransaccionDeshecha(async (tx) => {
      const repo = createDrizzlePasswordResetRepository(tx)
      const userId = await sembrarUsuario(tx)
      await repo.issue({ userId, codeHash: codigo(1), expiresAt: new Date(AHORA.getTime() + 600_000), now: AHORA })

      // Leer, comparar y contar después dejaba un hueco: en paralelo cabían más de cinco (F8).
      const salidas = await Promise.all(Array.from({ length: 12 }, () => repo.cobrarIntento(userId, AHORA)))

      expect(salidas.filter((x) => x.estado === 'cobrado')).toHaveLength(MAX_OTP_ATTEMPTS)
    })
  })

  it('un código gastado o caducado no admite intentos', async () => {
    await enTransaccionDeshecha(async (tx) => {
      const repo = createDrizzlePasswordResetRepository(tx)
      const userId = await sembrarUsuario(tx)

      await repo.issue({ userId, codeHash: codigo(1), expiresAt: new Date(AHORA.getTime() + 600_000), now: AHORA })
      const cobrado = await repo.cobrarIntento(userId, AHORA)
      await repo.consume(cobrado.estado === 'cobrado' ? cobrado.id : '', AHORA)
      expect(await repo.cobrarIntento(userId, AHORA)).toEqual({ estado: 'sin_codigo' })

      await repo.issue({ userId, codeHash: codigo(2), expiresAt: new Date(AHORA.getTime() - 1000), now: AHORA })
      expect(await repo.cobrarIntento(userId, AHORA)).toEqual({ estado: 'sin_codigo' })
    })
  })

  it('una fila por cuenta: emitir otro código no deja el anterior vivo', async () => {
    await enTransaccionDeshecha(async (tx) => {
      const repo = createDrizzlePasswordResetRepository(tx)
      const userId = await sembrarUsuario(tx)
      const expira = new Date(AHORA.getTime() + 600_000)

      await repo.issue({ userId, codeHash: codigo(1), expiresAt: expira, now: AHORA })
      await repo.issue({ userId, codeHash: codigo(2), expiresAt: expira, now: AHORA })

      const filas = (await tx.execute(sql`select code_hash from password_resets where user_id = ${userId}`)) as unknown as { code_hash: Buffer }[]
      expect(filas).toHaveLength(1)
      expect(Buffer.from(filas[0]!.code_hash).toString()).toBe(codigo(2).toString())
    })
  })
})
