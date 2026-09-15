import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { events, users } from '@/shared/db/schema'
import { drizzleQrRepository as repo } from './drizzle-qr-repository'

const correo = `qr-e2e-${crypto.randomUUID().slice(0, 8)}@ejemplo.bo`
const slug = `qr-repo-${crypto.randomUUID().slice(0, 8)}`
let userId = ''
let eventId = ''
const codeId = crypto.randomUUID()

beforeAll(async () => {
  const [usuario] = await db
    .insert(users)
    .values({ email: correo, passwordHash: '$argon2id$v=19$falso', role: 'atelier' })
    .returning({ id: users.id })
  userId = usuario!.id

  const [evento] = await db
    .insert(events)
    .values({
      userId,
      slug,
      title: 'Boda de los códigos',
      eventDate: '2027-08-14',
      rsvpDeadline: '2027-07-30',
      locale: 'es',
      themeKey: 'clasico',
      status: 'live',
    })
    .returning({ id: events.id })
  eventId = evento!.id

  await repo.insert({ id: codeId, userId, eventId, label: 'Mesa de regalos', kind: 'registry', target: '/es' })
})

afterAll(async () => {
  await db.delete(events).where(eq(events.id, eventId))
  await db.delete(users).where(eq(users.id, userId))
})

describe('drizzleQrRepository', () => {
  it('lista los códigos del evento', async () => {
    const filas = await repo.listByEvent(eventId)

    expect(filas.map((f) => f.label)).toEqual(['Mesa de regalos'])
    expect(filas[0]?.active).toBe(true)
    expect(filas[0]?.scanCount).toBe(0)
  })

  it('cuenta los escaneos **sumando en la base**, no leyendo y escribiendo', async () => {
    // Diez escaneos a la vez. Con un `select` seguido de un `update` se perderían cuentas,
    // y eso no aparece jamás en desarrollo: aquí es un `scan_count + 1` en la propia base.
    const cuando = new Date('2027-08-14T21:00:00.000Z')
    await Promise.all(Array.from({ length: 10 }, () => repo.countScan(codeId, cuando)))

    const fila = await repo.findById(codeId)
    expect(fila?.scanCount).toBe(10)
    expect(fila?.lastScanAt?.toISOString()).toBe(cuando.toISOString())
  })

  it('apagar un código no borra su etiqueta', async () => {
    await repo.update(codeId, { active: false })

    const fila = await repo.findById(codeId)
    expect(fila?.active).toBe(false)
    expect(fila?.label).toBe('Mesa de regalos')
  })

  it('cambiar el destino no toca el contador: lo impreso sigue siendo el mismo código', async () => {
    await repo.update(codeId, { target: 'https://otra-tienda.example.com' })

    const fila = await repo.findById(codeId)
    expect(fila?.target).toBe('https://otra-tienda.example.com')
    expect(fila?.scanCount).toBe(10)
  })

  it('borrar el evento se lleva sus códigos', async () => {
    const suelto = crypto.randomUUID()
    const [otro] = await db
      .insert(events)
      .values({
        userId,
        slug: `${slug}-otro`,
        title: 'Otra',
        eventDate: '2027-09-14',
        rsvpDeadline: '2027-08-30',
        locale: 'es',
        themeKey: 'clasico',
        status: 'live',
      })
      .returning({ id: events.id })

    await repo.insert({ id: suelto, userId, eventId: otro!.id, label: 'Suelto', kind: 'custom', target: '/es' })
    await db.delete(events).where(eq(events.id, otro!.id))

    expect(await repo.findById(suelto)).toBeNull()
  })
})

describe('borrar al usuario que creó un código', () => {
  /**
   * Esta prueba existe por un fallo que encontró el QA contra la base, no el typecheck:
   * `qr_codes.user_id` era `RESTRICT`, así que borrar a quien hubiera creado un código
   * reventaba con un error de clave foránea. `canDeleteUser` solo cuenta eventos, de modo
   * que el admin veía un fallo genérico sin motivo.
   *
   * Quién lo creó es **procedencia, no propiedad**: el código pertenece al evento.
   */
  it('no bloquea el borrado: el código sobrevive sin autor', async () => {
    const [autor] = await db
      .insert(users)
      .values({ email: `qr-autor-${crypto.randomUUID().slice(0, 8)}@ejemplo.bo`, passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$cHJ1ZWJh$cHJ1ZWJh', role: 'atelier' })
      .returning({ id: users.id })

    const suyo = crypto.randomUUID()
    await repo.insert({ id: suyo, userId: autor!.id, eventId, label: 'Del autor', kind: 'custom', target: '/es' })

    await db.delete(users).where(eq(users.id, autor!.id))

    const fila = await repo.findById(suyo)
    expect(fila).not.toBeNull()
    expect(fila?.userId).toBeNull()
  })
})
