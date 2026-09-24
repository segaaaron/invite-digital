import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { fakeGuestbookRepository, type FakeResponse } from './fake-guestbook-repository'
import { getGuestReply, listGuestbook, replyToMessage } from './guestbook-use-cases'

const EVENTO = 'evento-1'
const OTRO_EVENTO = 'evento-2'
const AHORA = new Date('2026-08-21T12:00:00.000Z')

const respuesta = (over: Partial<FakeResponse> = {}): FakeResponse => ({
  responseId: 'r1',
  eventId: EVENTO,
  guestGroupId: 'g1',
  groupLabel: 'Familia Rojas',
  body: 'Qué ganas de celebrar con ustedes.',
  writtenAt: new Date('2026-08-20T10:00:00.000Z'),
  ...over,
})

const clock = () => AHORA

const desempaqueta = <T>(r: { ok: true; value: T } | { ok: false; error: { kind: string; detail: string } }): T => {
  if (isErr(r)) throw new Error(`se esperaba ok, llegó ${r.error.kind}: ${r.error.detail}`)
  return r.value
}

describe('listGuestbook', () => {
  it('compone el mensaje con su nota', async () => {
    const fake = fakeGuestbookRepository({
      responses: [respuesta()],
      notes: [{ responseId: 'r1', readAt: AHORA, featuredAt: AHORA, reply: 'Gracias', repliedAt: AHORA }],
    })

    const [mensaje] = desempaqueta(await listGuestbook({ guestbook: fake.repo })(EVENTO))
    expect(mensaje?.body).toBe('Qué ganas de celebrar con ustedes.')
    expect(mensaje?.groupLabel).toBe('Familia Rojas')
    expect(mensaje?.reply).toBe('Gracias')
    expect(mensaje?.readAt).toEqual(AHORA)
  })

  it('un mensaje sin nota aparece igual, sin leer y sin destacar', async () => {
    const fake = fakeGuestbookRepository({ responses: [respuesta()] })

    const [mensaje] = desempaqueta(await listGuestbook({ guestbook: fake.repo })(EVENTO))
    expect(mensaje?.responseId).toBe('r1')
    expect(mensaje?.readAt).toBeNull()
    expect(mensaje?.featuredAt).toBeNull()
  })

  it('excluye las respuestas de RSVP sin mensaje: confirmar sin escribir no es una firma', async () => {
    const fake = fakeGuestbookRepository({
      responses: [respuesta(), respuesta({ responseId: 'r2', body: null })],
    })

    const mensajes = desempaqueta(await listGuestbook({ guestbook: fake.repo })(EVENTO))
    expect(mensajes.map((m) => m.responseId)).toEqual(['r1'])
  })

  it('un grupo con dos respuestas produce dos mensajes: dijo dos cosas en dos momentos', async () => {
    const fake = fakeGuestbookRepository({
      responses: [
        respuesta({ responseId: 'r1', body: 'Ahí estaremos los cuatro.' }),
        respuesta({
          responseId: 'r2',
          body: 'Al final solo vamos dos, disculpen.',
          writtenAt: new Date('2026-08-21T10:00:00.000Z'),
        }),
      ],
    })

    const mensajes = desempaqueta(await listGuestbook({ guestbook: fake.repo })(EVENTO))
    expect(mensajes.map((m) => m.responseId)).toEqual(['r2', 'r1'])
  })

  it('no devuelve los mensajes de otro evento', async () => {
    const fake = fakeGuestbookRepository({
      responses: [respuesta(), respuesta({ responseId: 'r9', eventId: OTRO_EVENTO })],
    })

    const mensajes = desempaqueta(await listGuestbook({ guestbook: fake.repo })(EVENTO))
    expect(mensajes.map((m) => m.responseId)).toEqual(['r1'])
  })
})

describe('replyToMessage', () => {
  it('guarda la respuesta recortada con su instante', async () => {
    const fake = fakeGuestbookRepository({ responses: [respuesta()] })

    const r = await replyToMessage({ guestbook: fake.repo, clock })({
      responseId: 'r1',
      eventId: EVENTO,
      text: '  ¡Gracias, nos vemos!  ',
    })

    expect(isOk(r)).toBe(true)
    expect(fake.notes.get('r1')?.reply).toBe('¡Gracias, nos vemos!')
    expect(fake.notes.get('r1')?.repliedAt).toEqual(AHORA)
  })

  it('sobre un mensaje ya respondido sustituye la respuesta anterior', async () => {
    const fake = fakeGuestbookRepository({
      responses: [respuesta()],
      notes: [
        {
          responseId: 'r1',
          readAt: null,
          featuredAt: null,
          reply: 'Gracias',
          repliedAt: new Date('2026-08-20T18:00:00.000Z'),
        },
      ],
    })

    await replyToMessage({ guestbook: fake.repo, clock })({
      responseId: 'r1',
      eventId: EVENTO,
      text: 'Gracias de nuevo, los esperamos',
    })

    expect(fake.notes.get('r1')?.reply).toBe('Gracias de nuevo, los esperamos')
    expect(fake.notes.get('r1')?.repliedAt).toEqual(AHORA)
  })

  it('una respuesta vacía se rechaza y no escribe nada', async () => {
    const fake = fakeGuestbookRepository({ responses: [respuesta()] })

    const r = await replyToMessage({ guestbook: fake.repo, clock })({ responseId: 'r1', eventId: EVENTO, text: '   ' })
    expect(isErr(r) && r.error.kind).toBe('invalid_reply')
    expect(fake.upserts).toBe(0)
  })

  it('una respuesta de más de mil caracteres se rechaza', async () => {
    const fake = fakeGuestbookRepository({ responses: [respuesta()] })

    const r = await replyToMessage({ guestbook: fake.repo, clock })({
      responseId: 'r1',
      eventId: EVENTO,
      text: 'a'.repeat(1001),
    })
    expect(isErr(r) && r.error.kind).toBe('invalid_reply')
  })

  it('un mensaje de otro evento se rechaza con wrong_event', async () => {
    const fake = fakeGuestbookRepository({ responses: [respuesta({ eventId: OTRO_EVENTO })] })

    const r = await replyToMessage({ guestbook: fake.repo, clock })({
      responseId: 'r1',
      eventId: EVENTO,
      text: 'Gracias',
    })
    expect(isErr(r) && r.error.kind).toBe('wrong_event')
  })

  it('un responseId inexistente da not_found', async () => {
    const fake = fakeGuestbookRepository({ responses: [] })

    const r = await replyToMessage({ guestbook: fake.repo, clock })({
      responseId: 'fantasma',
      eventId: EVENTO,
      text: 'Gracias',
    })
    expect(isErr(r) && r.error.kind).toBe('not_found')
  })
})

describe('getGuestReply', () => {
  it('devuelve la respuesta al último mensaje del grupo', async () => {
    const fake = fakeGuestbookRepository({
      responses: [respuesta()],
      notes: [{ responseId: 'r1', readAt: null, featuredAt: null, reply: 'Gracias', repliedAt: AHORA }],
    })

    expect(await getGuestReply({ guestbook: fake.repo })('g1')).toBe('Gracias')
  })

  it('devuelve null si su mensaje no tiene respuesta', async () => {
    const fake = fakeGuestbookRepository({ responses: [respuesta()] })
    expect(await getGuestReply({ guestbook: fake.repo })('g1')).toBeNull()
  })

  it('devuelve null si el grupo no escribió nada', async () => {
    const fake = fakeGuestbookRepository({ responses: [] })
    expect(await getGuestReply({ guestbook: fake.repo })('g1')).toBeNull()
  })

  it('con dos mensajes del mismo grupo gana el más reciente', async () => {
    const fake = fakeGuestbookRepository({
      responses: [
        respuesta({ responseId: 'r1' }),
        respuesta({ responseId: 'r2', writtenAt: new Date('2026-08-21T10:00:00.000Z') }),
      ],
      notes: [
        { responseId: 'r1', readAt: null, featuredAt: null, reply: 'Vieja', repliedAt: AHORA },
        { responseId: 'r2', readAt: null, featuredAt: null, reply: 'Nueva', repliedAt: AHORA },
      ],
    })

    expect(await getGuestReply({ guestbook: fake.repo })('g1')).toBe('Nueva')
  })

  it('si la base falla devuelve null: la invitación se abre igual', async () => {
    const roto = {
      async listMessages() {
        throw new Error('sin conexión')
      },
      async findLatestMessageForGroup(): Promise<never> {
        throw new Error('sin conexión')
      },
      async findResponseEvent() {
        throw new Error('sin conexión')
      },
      async upsertNote() {
        throw new Error('sin conexión')
      },
    }

    expect(await getGuestReply({ guestbook: roto })('g1')).toBeNull()
  })
})
