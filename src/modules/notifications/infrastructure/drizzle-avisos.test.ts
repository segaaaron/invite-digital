import { eq, inArray, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { eventStaff, events, users } from '@/shared/db/schema'
import { avisoDeRespuesta } from '../domain/avisos'
import { drizzleAvisos as avisos } from './drizzle-avisos'

const S = crypto.randomUUID().slice(0, 8)
const HASH = '$argon2id$v=19$m=19456,t=2,p=1$YWFhYWFhYWFhYWFhYWFhYQ$YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE'
let atelier = ''
let novia = ''
let puerta = ''
let eventId = ''

beforeAll(async () => {
  const creados = await db
    .insert(users)
    .values([
      { email: `atelier-${S}@x.bo`, passwordHash: HASH, role: 'atelier' },
      { email: `novia-${S}@x.bo`, passwordHash: HASH, role: 'cliente' },
      { email: `puerta-${S}@x.bo`, passwordHash: HASH, role: 'puerta' },
    ])
    .returning({ id: users.id, email: users.email })
  atelier = creados.find((u) => u.email.startsWith('atelier'))!.id
  novia = creados.find((u) => u.email.startsWith('novia'))!.id
  puerta = creados.find((u) => u.email.startsWith('puerta'))!.id
  const [e] = await db
    .insert(events)
    .values({ userId: atelier, slug: `avisos-${S}`, title: 'Boda de Ana', eventDate: '2027-05-01', rsvpDeadline: '2027-04-20', locale: 'es', themeKey: 'boda-bot', status: 'live' })
    .returning({ id: events.id })
  eventId = e!.id
  await db.insert(eventStaff).values([
    { eventId, userId: novia, membership: 'cliente' },
    { eventId, userId: puerta, membership: 'puerta' },
  ])
})

afterAll(async () => {
  await db.delete(events).where(eq(events.id, eventId))
  await db.delete(users).where(inArray(users.id, [atelier, novia, puerta]))
})

describe('avisos contra Postgres', () => {
  it('lee el evento con su dueño y su equipo', async () => {
    const ev = await avisos.delEvento(eventId)
    expect(ev?.titulo).toBe('Boda de Ana')
    expect(ev?.dueno).toEqual({ userId: atelier, role: 'atelier' })
    expect(ev?.equipo).toEqual(expect.arrayContaining([{ userId: novia, role: 'cliente', membership: 'cliente' }, { userId: puerta, role: 'puerta', membership: 'puerta' }]))
    expect(await avisos.delEvento(crypto.randomUUID())).toBeNull()
  })

  it('la campana: crea, cuenta los sin ver, lista del más nuevo y marca vistos', async () => {
    await avisos.crear([{ userId: novia, eventId, aviso: avisoDeRespuesta({ titulo: 'Boda de Ana', slug: 'x', invitado: 'Ramón', lugares: 2 }) }])
    await avisos.crear([{ userId: novia, eventId, aviso: avisoDeRespuesta({ titulo: 'Boda de Ana', slug: 'x', invitado: 'Lucía', lugares: 1 }) }])
    expect(await avisos.sinVer(novia)).toBe(2)
    expect((await avisos.listar(novia, 10)).map((a) => a.title)).toEqual(['Lucía confirmó su asistencia', 'Ramón confirmó 2 lugares'])
    await avisos.marcarVistos(novia)
    expect(await avisos.sinVer(novia)).toBe(0)
    expect((await avisos.listar(novia, 10)).every((a) => a.visto)).toBe(true)
  })

  it('los aparatos: re-suscribirse pisa el mismo endpoint, lo silenciado viaja con él y un endpoint ajeno no se borra', async () => {
    const sub = { endpoint: `https://fcm.googleapis.com/fcm/send/${S}`, p256dh: 'clave', auth: 'secreto' }
    await avisos.suscribir(novia, sub, 'Android · Chrome')
    await avisos.suscribir(novia, { ...sub, auth: 'secreto-2' }, 'Android · Chrome')
    await avisos.silenciar(novia, ['apertura'])
    const [aparato] = await avisos.aparatosDe([novia])
    expect(aparato).toMatchObject({ userId: novia, endpoint: sub.endpoint, auth: 'secreto-2', silenciados: ['apertura'] })
    expect(await avisos.cuantosAparatos(novia)).toBe(1)
    await avisos.desuscribir(atelier, sub.endpoint)
    expect(await avisos.cuantosAparatos(novia)).toBe(1)
    await avisos.olvidarAparato(aparato!.id)
    expect(await avisos.cuantosAparatos(novia)).toBe(0)
  })

  it('los eventos por venir (su agenda la arma el planner) y el aviso de agenda no se repite', async () => {
    // Solo los que tienen algo que avisar ese día (QA 9 oct): la víspera y el día del evento sí; diez días
    // antes, sin nada que venza, no (15 abr); una tarea que vence mañana lo vuelve a traer; pasado el evento, nunca.
    expect(await avisos.eventosConAvisos('2027-04-30')).toContain(eventId)
    expect(await avisos.eventosConAvisos('2027-05-01')).toContain(eventId)
    expect(await avisos.eventosConAvisos('2027-04-15')).not.toContain(eventId)
    await db.execute(sql`insert into planner_tasks (event_id, stage, title, due_date) values (${eventId}, 'mes', 'Prueba de vestido', '2027-04-16')`)
    expect(await avisos.eventosConAvisos('2027-04-15')).toContain(eventId)
    // El cierre de confirmaciones (20 abr) también lo trae.
    expect(await avisos.eventosConAvisos('2027-04-20')).toContain(eventId)
    expect(await avisos.eventosConAvisos('2027-05-02')).not.toContain(eventId)
    expect(await avisos.yaAvisado(eventId, 'Mañana: Prueba de vestido')).toBe(false)
    await avisos.crear([{ userId: novia, eventId, aviso: { kind: 'agenda', title: 'Mañana: Prueba de vestido', body: '', href: '/x' } }])
    expect(await avisos.yaAvisado(eventId, 'Mañana: Prueba de vestido')).toBe(true)
  })
})

