import postgres from 'postgres'
import { describe, expect, it } from 'vitest'
import { env } from '@/shared/config/env'
import { enExclusiva } from './candado'

/**
 * Contra Postgres real. Otra conexión retiene el candado: es determinista, a diferencia de dos
 * llamadas en `Promise.all`, que el pool puede serializar y dar verde sin candado.
 */
describe('enExclusiva', () => {
  it('con el candado tomado por otro, espera a que lo suelte antes de entrar', async () => {
    const clave = `prueba:${crypto.randomUUID()}`
    const otro = postgres(env.DATABASE_URL, { max: 1 })
    let entro = false
    let pendiente: Promise<string> | undefined
    try {
      await otro.begin(async (tx) => {
        await tx`select pg_advisory_xact_lock(hashtext(${clave}))`
        pendiente = enExclusiva(clave, async () => {
          entro = true
          return 'hecho'
        })
        await new Promise((r) => setTimeout(r, 300))
        expect(entro).toBe(false)
      })
    } finally {
      await otro.end()
    }
    expect(await pendiente!).toBe('hecho')
    expect(entro).toBe(true)
  })

  it('otra clave no espera', async () => {
    const clave = `prueba:${crypto.randomUUID()}`
    const otro = postgres(env.DATABASE_URL, { max: 1 })
    try {
      await otro.begin(async (tx) => {
        await tx`select pg_advisory_xact_lock(hashtext(${clave}))`
        expect(await enExclusiva(`${clave}:otra`, async () => 'libre')).toBe('libre')
      })
    } finally {
      await otro.end()
    }
  })
})
