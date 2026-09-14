import { inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { consultationRequests } from '@/shared/db/schema'
import { NOMBRE_ANONIMO } from '../domain/pipeline'
import { drizzleConsultationInbox as inbox } from './drizzle-consultation-inbox'

const ids: string[] = []

async function sembrar(nombre: string, creada: Date) {
  const [fila] = await db
    .insert(consultationRequests)
    .values({ name: nombre, email: 'x@ejemplo.bo', phone: '+59170000000', message: 'hola', note: 'nota', locale: 'es', status: 'lost', createdAt: creada })
    .returning({ id: consultationRequests.id })
  ids.push(fila!.id)
  return fila!.id
}

afterAll(async () => {
  await db.delete(consultationRequests).where(inArray(consultationRequests.id, ids))
})

describe('retención de consultas contra Postgres', () => {
  it('borra el dato personal de las viejas, conserva estado y fecha, y no toca las recientes', async () => {
    const corte = new Date('2020-01-01T00:00:00Z')
    const vieja = await sembrar('Vieja Retención', new Date('2019-06-01T00:00:00Z'))
    const reciente = await sembrar('Reciente Retención', new Date('2020-06-01T00:00:00Z'))

    expect(await inbox.anonymizeBefore(corte)).toBeGreaterThanOrEqual(1)

    const v = await inbox.find(vieja)
    expect(v).toMatchObject({ name: NOMBRE_ANONIMO, email: null, phone: null, message: null, note: null, status: 'lost' })
    expect(v?.createdAt.toISOString()).toBe('2019-06-01T00:00:00.000Z')
    expect((await inbox.find(reciente))?.name).toBe('Reciente Retención')

    // Idempotente: una segunda pasada no vuelve a contar la ya anonimizada.
    const antes = await inbox.find(vieja)
    await inbox.anonymizeBefore(corte)
    expect(await inbox.find(vieja)).toEqual(antes)
  })
})
