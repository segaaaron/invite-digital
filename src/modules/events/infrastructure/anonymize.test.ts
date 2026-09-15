import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import {
  arrivals,
  budgetItems,
  doorPorters,
  events,
  fundContributions,
  giftFunds,
  guestGroups,
  guestPeople,
  messageNotes,
  plannerTasks,
  rsvpResponses,
} from '@/shared/db/schema'
import { createDrizzleRsvpRepository } from '@/modules/rsvp/infrastructure/drizzle-rsvp-repository'
import { createDrizzleEventRepository } from './drizzle-event-repository'

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

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

const seedEvent = async (tx: Tx, options: { eventDate: string; retentionDays: number }) => {
  const [row] = await tx
    .insert(events)
    .values({
      slug: `anon-${crypto.randomUUID().slice(0, 8)}`,
      title: 'Evento a anonimizar',
      eventDate: options.eventDate,
      rsvpDeadline: options.eventDate,
      locale: 'es',
      themeKey: 'clasico',
      status: 'closed',
      retentionDays: options.retentionDays,
    })
    .returning({ id: events.id, slug: events.slug })
  return row!
}

const NOW = new Date('2026-08-19T12:00:00Z')

describe('anonimización', () => {
  it('lista solo los eventos cuya retención venció y no se anonimizaron', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleEventRepository(tx)
      const vencido = await seedEvent(tx, { eventDate: '2026-01-01', retentionDays: 30 })
      const vigente = await seedEvent(tx, { eventDate: '2026-08-15', retentionDays: 90 })
      const yaHecho = await seedEvent(tx, { eventDate: '2026-01-01', retentionDays: 30 })
      await tx.update(events).set({ anonymizedAt: NOW }).where(eq(events.id, yaHecho.id))

      const slugs = (await repo.listPendingAnonymization(NOW)).map((row) => row.slug)
      expect(slugs).toContain(vencido.slug)
      expect(slugs).not.toContain(vigente.slug)
      expect(slugs).not.toContain(yaHecho.slug)
    })
  })

  it('anonimiza también a las personas del grupo: nombre, restricción alimentaria y correo', async () => {
    // `guest_people` guarda el nombre y apellido de una persona concreta y su restricción
    // alimentaria, que en la práctica es un dato de salud —«alergia a los frutos secos»—.
    // Quedarse eso tras la retención es peor que quedarse la etiqueta del grupo.
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleEventRepository(tx)
      const evento = await seedEvent(tx, { eventDate: '2026-01-01', retentionDays: 30 })

      const [grupo] = await tx
        .insert(guestGroups)
        .values({ eventId: evento.id, label: 'Familia Rojas Peña', seats: 4, tokenHash: Buffer.alloc(32, 21) })
        .returning({ id: guestGroups.id })

      await tx.insert(guestPeople).values([
        {
          guestGroupId: grupo!.id,
          fullName: 'Ana Lucía Vega',
          dietaryNote: 'Alergia a los frutos secos',
          email: 'ana@correo.bo',
          vip: true,
        },
        { guestGroupId: grupo!.id, fullName: 'Roberto Núñez', dietaryNote: null, isCompanion: true },
      ])

      await repo.anonymize(evento.id, NOW)

      const personas = await tx.select().from(guestPeople).where(eq(guestPeople.guestGroupId, grupo!.id))
      expect(personas).toHaveLength(2)
      expect(personas.every((p) => !p.fullName.includes('Ana') && !p.fullName.includes('Roberto'))).toBe(true)
      expect(personas.every((p) => p.dietaryNote === null)).toBe(true)
      // El correo es un dato personal como el nombre: se va con él.
      expect(personas.every((p) => p.email === null)).toBe(true)
      // El agregado se conserva: cuántas personas eran, y si eran acompañantes.
      expect(personas.filter((p) => p.isCompanion)).toHaveLength(1)
    })
  })

  it('borra lo que identifica y conserva los agregados', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleEventRepository(tx)
      const rsvpRepo = createDrizzleRsvpRepository(tx)
      const evento = await seedEvent(tx, { eventDate: '2026-01-01', retentionDays: 30 })

      const [primero] = await tx
        .insert(guestGroups)
        .values({
          eventId: evento.id,
          label: 'Familia Rojas Peña',
          seats: 4,
          phone: '+59170011122',
          tokenHash: Buffer.alloc(32, 11),
        })
        .returning({ id: guestGroups.id })
      await tx
        .insert(guestGroups)
        .values({ eventId: evento.id, label: 'Daniela Ortiz', seats: 1, tokenHash: Buffer.alloc(32, 12) })

      await tx.insert(rsvpResponses).values({
        guestGroupId: primero!.id,
        attending: 3,
        responderName: 'Jorge Rojas',
        message: 'Vamos tres, gracias',
      })

      const antes = await rsvpRepo.tallyRowsFor(evento.id)
      await repo.anonymize(evento.id, NOW)

      const grupos = await tx.select().from(guestGroups).where(eq(guestGroups.eventId, evento.id))
      expect(grupos.map((g) => g.label).sort()).toEqual(['Grupo 1', 'Grupo 2'])
      expect(grupos.map((g) => g.seats).sort()).toEqual([1, 4])
      // El teléfono identifica a la misma persona que la etiqueta: se borra con ella.
      expect(grupos.every((g) => g.phone === null)).toBe(true)

      const respuestas = await tx.select().from(rsvpResponses).where(eq(rsvpResponses.guestGroupId, primero!.id))
      expect(respuestas[0]?.message).toBeNull()
      // El nombre de quien contestó se va con el mensaje: es la persona, no el grupo.
      expect(respuestas[0]?.responderName).toBeNull()
      // El recuento se conserva: es lo que hace la estadística y no identifica a nadie.
      expect(respuestas[0]?.attending).toBe(3)

      expect(await rsvpRepo.tallyRowsFor(evento.id)).toEqual(antes)

      const [fila] = await tx.select({ anonymizedAt: events.anonymizedAt }).from(events).where(eq(events.id, evento.id))
      expect(fila?.anonymizedAt).not.toBeNull()
    })
  })

  it('anonimiza quién contribuyó pero conserva los importes', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleEventRepository(tx)
      const evento = await seedEvent(tx, { eventDate: '2026-01-01', retentionDays: 30 })

      const [fondo] = await tx
        .insert(giftFunds)
        .values({ eventId: evento.id, name: 'Luna de miel', goalCents: 500_000 })
        .returning({ id: giftFunds.id })

      await tx.insert(fundContributions).values([
        {
          fundId: fondo!.id,
          displayName: 'Abuela Rosa Quiroga',
          amountCents: 15_000,
          method: 'envelope',
          message: 'Que sean muy felices, con todo mi cariño.',
        },
        {
          fundId: fondo!.id,
          displayName: 'Familia Vargas',
          amountCents: 25_000,
          method: 'transfer',
          message: null,
        },
      ])

      await repo.anonymize(evento.id, NOW)

      const filas = await tx.select().from(fundContributions).where(eq(fundContributions.fundId, fondo!.id))

      // El nombre y el mensaje son datos personales de terceros: gente que ni siquiera
      // está invitada, como la abuela del sobre.
      expect(filas.map((f) => f.displayName)).toEqual(['Anónimo', 'Anónimo'])
      expect(filas.map((f) => f.message)).toEqual([null, null])

      // Los importes se conservan: la contabilidad de la pareja no es un dato personal,
      // y borrarla dejaría el fondo descuadrado para siempre.
      expect(filas.map((f) => f.amountCents).sort((a, b) => a - b)).toEqual([15_000, 25_000])
    })
  })

  it('al vencer, la respuesta del atelier al mensaje también se borra', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleEventRepository(tx)
      const evento = await seedEvent(tx, { eventDate: '2026-01-01', retentionDays: 30 })

      const [grupo] = await tx
        .insert(guestGroups)
        .values({ eventId: evento.id, label: 'Familia Rojas Peña', seats: 4, tokenHash: Buffer.alloc(32, 21) })
        .returning({ id: guestGroups.id })
      const [respuesta] = await tx
        .insert(rsvpResponses)
        .values({ guestGroupId: grupo!.id, attending: 3, message: 'Vamos tres, gracias' })
        .returning({ id: rsvpResponses.id })
      await tx.insert(messageNotes).values({
        rsvpResponseId: respuesta!.id,
        readAt: NOW,
        featuredAt: NOW,
        reply: 'Gracias, Rojas Peña, los esperamos',
        repliedAt: NOW,
      })

      await repo.anonymize(evento.id, NOW)

      const [nota] = await tx.select().from(messageNotes).where(eq(messageNotes.rsvpResponseId, respuesta!.id))
      // La respuesta es texto escrito SOBRE un dato personal: borrar el mensaje y dejar
      // la respuesta —que suele llevar el nombre del invitado— sería anonimizar a medias.
      expect(nota?.reply).toBeNull()
      expect(nota?.repliedAt).toBeNull()
      // Leído y destacado se conservan: no identifican a nadie.
      expect(nota?.featuredAt).not.toBeNull()
    })
  })

  it('no toca las respuestas del libro de otro evento que sigue vigente', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleEventRepository(tx)
      const vencido = await seedEvent(tx, { eventDate: '2026-01-01', retentionDays: 30 })
      const vigente = await seedEvent(tx, { eventDate: '2026-08-15', retentionDays: 90 })

      const [grupoAjeno] = await tx
        .insert(guestGroups)
        .values({ eventId: vigente.id, label: 'Familia Ajena', seats: 2, tokenHash: Buffer.alloc(32, 22) })
        .returning({ id: guestGroups.id })
      const [respuestaAjena] = await tx
        .insert(rsvpResponses)
        .values({ guestGroupId: grupoAjeno!.id, attending: 2, message: 'Ahí estaremos' })
        .returning({ id: rsvpResponses.id })
      await tx
        .insert(messageNotes)
        .values({ rsvpResponseId: respuestaAjena!.id, reply: 'Gracias, Ajena', repliedAt: NOW })

      await repo.anonymize(vencido.id, NOW)

      const [nota] = await tx.select().from(messageNotes).where(eq(messageNotes.rsvpResponseId, respuestaAjena!.id))
      expect(nota?.reply).toBe('Gracias, Ajena')
    })
  })

  it('no toca las contribuciones de un evento que no se está anonimizando', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleEventRepository(tx)
      const vencido = await seedEvent(tx, { eventDate: '2026-01-01', retentionDays: 30 })
      const vigente = await seedEvent(tx, { eventDate: '2026-08-15', retentionDays: 90 })

      const [fondoAjeno] = await tx
        .insert(giftFunds)
        .values({ eventId: vigente.id, name: 'Fondo de la otra boda', goalCents: 100_000 })
        .returning({ id: giftFunds.id })
      await tx.insert(fundContributions).values({
        fundId: fondoAjeno!.id,
        displayName: 'Abuela Rosa Quiroga',
        amountCents: 15_000,
        method: 'envelope',
        message: 'Enhorabuena.',
      })

      await repo.anonymize(vencido.id, NOW)

      const [ajena] = await tx.select().from(fundContributions).where(eq(fundContributions.fundId, fondoAjeno!.id))
      expect(ajena?.displayName).toBe('Abuela Rosa Quiroga')
      expect(ajena?.message).toBe('Enhorabuena.')
    })
  })

  it('al vencer, se borran sus porteros y las llegadas dejan de decir quién las registró', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleEventRepository(tx)
      const evento = await seedEvent(tx, { eventDate: '2026-01-01', retentionDays: 30 })
      const [portero] = await tx
        .insert(doorPorters)
        .values({ eventId: evento.id, name: 'Carlos Mendoza', phone: '+59170012345', tokenHash: Buffer.alloc(32, 1), pinHash: Buffer.alloc(32, 2) })
        .returning({ id: doorPorters.id })
      const [grupo] = await tx
        .insert(guestGroups)
        .values({ eventId: evento.id, label: 'Familia Rojas', seats: 2, tokenHash: Buffer.alloc(32, 3) })
        .returning({ id: guestGroups.id })
      await tx.insert(arrivals).values({
        scanId: crypto.randomUUID(),
        guestGroupId: grupo!.id,
        arrivedCount: 2,
        scannedAt: NOW,
        recordedBy: `porter:${portero!.id}`,
      })

      await repo.anonymize(evento.id, NOW)

      // El portero es una persona con nombre y teléfono, y su acceso ya no sirve de nada.
      expect(await tx.select().from(doorPorters).where(eq(doorPorters.eventId, evento.id))).toEqual([])
      // La llegada se conserva —cuenta para la estadística— sin decir quién la registró.
      const [llegada] = await tx.select().from(arrivals).where(eq(arrivals.guestGroupId, grupo!.id))
      expect(llegada).toMatchObject({ arrivedCount: 2, recordedBy: null })
    })
  })

  it('al vencer, el planner pierde nombres y notas y conserva tareas e importes', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleEventRepository(tx)
      const evento = await seedEvent(tx, { eventDate: '2026-01-01', retentionDays: 30 })
      await tx.insert(plannerTasks).values({ eventId: evento.id, stage: 'm1', title: 'Llamar al DJ', notes: 'Carlos 70012345', doneAt: NOW, doneBy: 'ana@ejemplo.bo' })
      await tx.insert(budgetItems).values({ eventId: evento.id, category: 'torta', concept: 'Torta', estimatedCents: 800_00, payer: 'padrino', padrinoLabel: 'Tío Jorge Quiroga', notes: 'Paga en efectivo' })

      await repo.anonymize(evento.id, NOW)

      const [tarea] = await tx.select().from(plannerTasks).where(eq(plannerTasks.eventId, evento.id))
      expect(tarea).toMatchObject({ title: 'Llamar al DJ', notes: null, doneBy: null })
      const [partida] = await tx.select().from(budgetItems).where(eq(budgetItems.eventId, evento.id))
      expect(partida).toMatchObject({ estimatedCents: 800_00, padrinoLabel: null, notes: null })
    })
  })
})
