import { inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { orders } from '@/shared/db/schema'
import { fechaEnBolivia } from '../domain/hoy'
import { drizzleIncomeReader } from './drizzle-income-reader'

const creados: string[] = []
const ref = () => `T${crypto.randomUUID().replaceAll('-', '').slice(0, 7).toUpperCase()}`

async function pedido(status: string, amountCents: number, decidedAt: Date | null): Promise<void> {
  const [fila] = await db
    .insert(orders)
    .values({ publicRef: ref(), customerName: 'Cifras', contact: 'cifras@x.bo', status, amountCents, currency: 'BOB', decidedAt })
    .returning({ id: orders.id })
  creados.push(fila!.id)
}

afterAll(async () => {
  if (creados.length > 0) await db.delete(orders).where(inArray(orders.id, creados))
})

describe('cifrasDelMes, contra Postgres', () => {
  it('suma lo aprobado en el mes de Bolivia y separa lo que espera revisión o pago', async () => {
    const ahora = new Date()
    const mes = fechaEnBolivia(ahora).slice(0, 7)
    const antes = await drizzleIncomeReader.cifrasDelMes(mes)

    await pedido('approved', 100_000, ahora)
    // Hace dos meses: no es de este mes.
    await pedido('approved', 50_000, new Date(ahora.getTime() - 62 * 24 * 60 * 60 * 1000))
    await pedido('proof_submitted', 30_000, null)
    await pedido('pending_payment', 20_000, null)

    const despues = await drizzleIncomeReader.cifrasDelMes(mes)
    expect(despues.esteMes - antes.esteMes).toBe(100_000)
    expect(despues.porRevisar - antes.porRevisar).toBe(30_000)
    expect(despues.sinPago - antes.sinPago).toBe(20_000)
  })
})
