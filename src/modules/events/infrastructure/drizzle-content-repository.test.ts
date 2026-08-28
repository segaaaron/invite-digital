import { eq } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { eventContent, events } from '@/shared/db/schema'
import { drizzleContentRepository } from './drizzle-content-repository'

const SLUG = 'contenido-repo-test'

const crearEvento = async (): Promise<string> => {
  const [fila] = await db
    .insert(events)
    .values({
      slug: SLUG,
      title: 'Evento de prueba',
      eventDate: '2026-12-05',
      rsvpDeadline: '2026-11-20',
      locale: 'es',
      themeKey: 'boda',
      status: 'live',
    })
    .returning({ id: events.id })
  if (fila === undefined) throw new Error('No se pudo crear el evento de prueba')
  return fila.id
}

afterAll(async () => {
  await db.delete(events).where(eq(events.slug, SLUG))
})

describe('el repositorio de contenido (contra Postgres real)', () => {
  it('un evento sin fila devuelve null, no un objeto vacío', async () => {
    // Es la distinción que decide si una invitación vieja se ve con la muestra del diseño
    // o en blanco. Con dobles se puede fingir; contra la base es donde importa.
    const eventId = await crearEvento()

    expect(await drizzleContentRepository.find(eventId)).toBeNull()

    await db.delete(events).where(eq(events.id, eventId))
  })

  it('guarda y devuelve el contenido con acentos, saltos y listas', async () => {
    const eventId = await crearEvento()
    const blocks = {
      quote: { text: 'Que nunca dejes de soñar,\ny que cada sueño te encuentre preparada.' },
      itinerary: [{ time: '18:00', label: 'Recepción' }],
    }

    await drizzleContentRepository.save(eventId, blocks)

    expect(await drizzleContentRepository.find(eventId)).toEqual(blocks)

    await db.delete(events).where(eq(events.id, eventId))
  })

  it('guardar dos veces actualiza, no duplica', async () => {
    // La clave primaria es el evento: un `insert` sin `on conflict` reventaría al segundo
    // guardado, que es lo que pasa cada vez que el atelier corrige una frase.
    const eventId = await crearEvento()

    await drizzleContentRepository.save(eventId, { quote: { text: 'Primera' } })
    await drizzleContentRepository.save(eventId, { quote: { text: 'Segunda' } })

    expect(await drizzleContentRepository.find(eventId)).toEqual({ quote: { text: 'Segunda' } })
    const filas = await db.select().from(eventContent).where(eq(eventContent.eventId, eventId))
    expect(filas).toHaveLength(1)

    await db.delete(events).where(eq(events.id, eventId))
  })

  it('vaciar deja la fila con un objeto vacío, que no es lo mismo que no tenerla', async () => {
    const eventId = await crearEvento()
    await drizzleContentRepository.save(eventId, { quote: { text: 'Algo' } })

    await drizzleContentRepository.clear(eventId)

    expect(await drizzleContentRepository.find(eventId)).toEqual({})

    await db.delete(events).where(eq(events.id, eventId))
  })

  it('cae en cascada al borrar el evento', async () => {
    const eventId = await crearEvento()
    await drizzleContentRepository.save(eventId, { quote: { text: 'Algo' } })

    await db.delete(events).where(eq(events.id, eventId))

    const filas = await db.select().from(eventContent).where(eq(eventContent.eventId, eventId))
    expect(filas).toHaveLength(0)
  })
})
