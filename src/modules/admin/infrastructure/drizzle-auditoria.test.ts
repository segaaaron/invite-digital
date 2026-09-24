import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { auditLog } from '@/shared/db/schema'
import { patronDeBusqueda } from '../domain/busqueda'
import { prefijosDeGrupo } from '../domain/auditoria'
import { drizzleAdminRepository as repo } from './drizzle-admin-repository'

const marca = crypto.randomUUID().slice(0, 8)
const ana = `ana-${marca}@ejemplo.bo`
const beto = `beto-${marca}@ejemplo.bo`

beforeAll(async () => {
  await db.insert(auditLog).values([
    { actorEmail: ana, action: 'soporte.entrada', subject: `Boda de Lucía ${marca}` },
    { actorEmail: ana, action: 'plan.editado', subject: `Alta Costura ${marca}` },
    { actorEmail: beto, action: 'soporte.salida', subject: `Boda de Lucía ${marca}` },
  ])
})

afterAll(async () => {
  await db.delete(auditLog).where(eq(auditLog.actorEmail, ana))
  await db.delete(auditLog).where(eq(auditLog.actorEmail, beto))
})

const acciones = (filas: { action: string }[]) => filas.map((f) => f.action).sort()

describe('listAudit con filtros, contra Postgres', () => {
  it('por tipo, por persona y por texto sin tildes, y combinados', async () => {
    const soporte = await repo.listAudit(50, { prefijos: prefijosDeGrupo('soporte') ?? undefined, patron: patronDeBusqueda(marca) ?? undefined })
    expect(acciones(soporte)).toEqual(['soporte.entrada', 'soporte.salida'])

    const deAna = await repo.listAudit(50, { actorEmail: ana })
    expect(acciones(deAna)).toEqual(['plan.editado', 'soporte.entrada'])

    const lucia = await repo.listAudit(50, { patron: patronDeBusqueda(`boda de lucia ${marca}`) ?? undefined })
    expect(lucia).toHaveLength(2)

    const combinado = await repo.listAudit(50, { actorEmail: beto, prefijos: prefijosDeGrupo('soporte') ?? undefined })
    expect(acciones(combinado)).toEqual(['soporte.salida'])
  })

  it('los que aparecen en el registro salen en el filtro «Quién»', async () => {
    const actores = await repo.listAuditActors()
    expect(actores).toEqual(expect.arrayContaining([ana, beto]))
  })
})
