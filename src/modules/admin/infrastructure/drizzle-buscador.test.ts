import { inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { consultationRequests } from '@/shared/db/schema'
import { drizzleBuscador } from './drizzle-buscador'

const marca = crypto.randomUUID().slice(0, 8)
const creadas: string[] = []

async function consulta(name: string): Promise<void> {
  const [fila] = await db.insert(consultationRequests).values({ name, locale: 'es' }).returning({ id: consultationRequests.id })
  creadas.push(fila!.id)
}

afterAll(async () => {
  if (creadas.length > 0) await db.delete(consultationRequests).where(inArray(consultationRequests.id, creadas))
})

describe('drizzleBuscador, contra Postgres', () => {
  it('encuentra sin tildes lo que se escribió con ellas, y al revés', async () => {
    await consulta(`Lucía Búsqueda ${marca}`)
    await consulta(`Lucia Busqueda Sin ${marca}`)

    const sinTildes = await drizzleBuscador(`lucia busqueda`)
    const conTildes = await drizzleBuscador(`lucía búsqueda`)
    const nuestras = (r: typeof sinTildes) => r.consultas.filter((c) => c.name.endsWith(marca) || c.name.includes(`Sin ${marca}`))

    expect(nuestras(sinTildes)).toHaveLength(2)
    expect(nuestras(conTildes)).toHaveLength(2)
  })

  it('un «%» se busca como texto, no como comodín', async () => {
    await consulta(`Descuento 50% ${marca}`)
    await consulta(`Descuento 500 ${marca}`)

    const r = await drizzleBuscador(`50% ${marca}`)
    expect(r.consultas.map((c) => c.name)).toEqual([`Descuento 50% ${marca}`])
  })
})
