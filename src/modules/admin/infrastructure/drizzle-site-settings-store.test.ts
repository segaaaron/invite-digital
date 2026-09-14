import { eq, gte, and } from 'drizzle-orm'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { env } from '@/shared/config/env'
import { db } from '@/shared/db/client'
import { appSettings, auditLog, siteSettingsVersions } from '@/shared/db/schema'
import { SITE_SETTINGS_KEY } from '../domain/site-settings'
import { drizzleSiteSettingsStore as store } from './drizzle-site-settings-store'

/**
 * Contra Postgres real, porque lo que se prueba es de la base: la transacción y el candado.
 * Toca la fila vigente de «La web», así que la guarda al empezar y la repone al terminar, y
 * borra las versiones y la auditoría que deja.
 */
const actorEmail = `web-store-${crypto.randomUUID().slice(0, 8)}@ejemplo.bo`
let previa: string | undefined
let inicio = new Date()

const entrada = (base: string | null, ciudad: string, actorUserId: string | null = null) => ({
  base,
  data: { ciudad },
  partida: { ciudad: 'partida' },
  campos: ['ciudad'],
  actorUserId: actorUserId as string,
  actorEmail,
  accion: 'web.editada',
})

const valorVigente = async () =>
  (await db.select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, SITE_SETTINGS_KEY)))[0]?.value

const versionesMias = async () =>
  db.select().from(siteSettingsVersions).where(and(gte(siteSettingsVersions.createdAt, inicio), eq(siteSettingsVersions.actorEmail, actorEmail)))

beforeAll(async () => {
  previa = await valorVigente()
  inicio = new Date(Date.now() - 1000)
})

afterAll(async () => {
  await db.delete(siteSettingsVersions).where(eq(siteSettingsVersions.actorEmail, actorEmail))
  await db.delete(auditLog).where(eq(auditLog.actorEmail, actorEmail))
  if (previa === undefined) await db.delete(appSettings).where(eq(appSettings.key, SITE_SETTINGS_KEY))
  else await db.update(appSettings).set({ value: previa }).where(eq(appSettings.key, SITE_SETTINGS_KEY))
})

describe('«La web» contra Postgres', () => {
  it('si falla la auditoría no queda ni el valor ni la versión: todo o nada', async () => {
    const { ultimaVersion } = await store.current()
    const antes = await valorVigente()

    // Un actor que no es un UUID hace fallar la última escritura, la de la auditoría.
    await expect(store.commit(entrada(ultimaVersion, 'Oruro', 'no-es-un-uuid'))).rejects.toThrow()

    expect(await valorVigente()).toBe(antes)
    expect(await versionesMias()).toEqual([])
    expect((await store.current()).ultimaVersion).toBe(ultimaVersion)
  })

  it('mientras otro admin guarda, el segundo espera al candado y recibe conflicto', async () => {
    const { ultimaVersion } = await store.current()
    // Otra conexión hace de «otro admin»: toma el candado y escribe su versión sin cerrar
    // todavía. Es determinista, a diferencia de dos `commit` en `Promise.all`, que el pool
    // puede acabar serializando y dar verde sin candado —se comprobó—.
    const otroAdmin = postgres(env.DATABASE_URL, { max: 1 })
    let pendiente: ReturnType<typeof store.commit> | undefined
    try {
      await otroAdmin.begin(async (tx) => {
        await tx`select pg_advisory_xact_lock(hashtext(${SITE_SETTINGS_KEY}))`
        pendiente = store.commit(entrada(ultimaVersion, 'Beni'))
        pendiente.catch(() => {})
        await new Promise((r) => setTimeout(r, 300))
        await tx`insert into site_settings_versions (data, campos, actor_email, created_at)
          values (${tx.json({ ciudad: 'Potosí' })}, ${['ciudad']}, ${actorEmail}, clock_timestamp())`
      })
    } finally {
      await otroAdmin.end()
    }

    const r = await pendiente!
    expect(r.ok).toBe(false)
    expect(!r.ok && (r.ultima.data as { ciudad: string }).ciudad).toBe('Potosí')
    expect(await versionesMias()).toHaveLength(1)
  })

  it('con la base al día guarda valor, versión y auditoría juntos', async () => {
    const { ultimaVersion } = await store.current()
    expect(await store.commit(entrada(ultimaVersion, 'Pando'))).toEqual({ ok: true })

    expect(JSON.parse((await valorVigente())!).ciudad).toBe('Pando')
    const [ultima] = await store.list(1)
    expect(ultima).toMatchObject({ actorEmail, campos: ['ciudad'] })
    const auditoria = await db.select().from(auditLog).where(eq(auditLog.actorEmail, actorEmail))
    expect(auditoria.map((a) => a.detail)).toContain('ciudad')
  })
})
