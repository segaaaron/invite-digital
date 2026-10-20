import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { createTokenMinter } from '@/shared/security/tokens'
import { MAX_INTENTOS_PIN } from '../domain/porter'
import { addPorter, enterWithPin, listPorters, resolvePorter, resolvePorterDelEnlace, revokePorter } from './porter-use-cases'
import type { PorterRow, PorterStore } from './ports'

const EVENTO = { eventId: 'e1', eventSlug: 'xv-valeria', eventTitle: 'XV de Valeria', eventDate: '2026-10-17' }
// Dentro de la ventana del 17 de octubre en Bolivia.
const DENTRO = new Date('2026-10-17T20:00:00Z')

function dobles(ahora = DENTRO) {
  const filas: PorterRow[] = []
  let reloj = ahora
  const porters: PorterStore = {
    async add(p) {
      const id = `p${filas.length + 1}`
      filas.push({ ...EVENTO, ...p, id, failedAttempts: 0, lockedUntil: null, revokedAt: null, createdAt: reloj })
      return id
    },
    async listActive(eventId) {
      return filas.filter((f) => f.eventId === eventId && f.revokedAt === null)
    },
    async countActive(eventId) {
      return filas.filter((f) => f.eventId === eventId && f.revokedAt === null).length
    },
    async findByTokenHash(hash) {
      return filas.find((f) => f.tokenHash.equals(hash)) ?? null
    },
    async registerFailure(id, lockUntil, max) {
      const i = filas.findIndex((f) => f.id === id)
      const f = filas[i]!
      const intentos = f.failedAttempts + 1
      filas[i] = { ...f, failedAttempts: intentos, lockedUntil: intentos >= max ? lockUntil : f.lockedUntil }
    },
    async resetFailures(id) {
      const i = filas.findIndex((f) => f.id === id)
      filas[i] = { ...filas[i]!, failedAttempts: 0, lockedUntil: null }
    },
    async arrivalsByPorter() {
      return {}
    },
    async revoke(id, eventId, at) {
      const i = filas.findIndex((f) => f.id === id && f.eventId === eventId && f.revokedAt === null)
      if (i === -1) return false
      filas[i] = { ...filas[i]!, revokedAt: at }
      return true
    },
  }
  const deps = {
    porters,
    minter: createTokenMinter(),
    clock: () => reloj,
    random: (n: number) => new Uint8Array(n).fill(9),
    secreto: 'secreto-del-servidor-de-pruebas',
  }
  return { deps, filas, mover: (t: Date) => (reloj = t) }
}

const alta = { eventId: 'e1', limit: 3 as number | null, createdByUserId: 'u1', name: 'Carlos', phone: '', gate: 'Puerta 1' }

describe('addPorter', () => {
  it('devuelve enlace y PIN una sola vez; en la base solo quedan sus hashes', async () => {
    const { deps, filas } = dobles()
    const r = await addPorter(deps)(alta)
    expect(isOk(r)).toBe(true)
    if (!isOk(r)) return
    expect(r.value.pin).toMatch(/^\d{6}$/)
    expect(filas[0]!.tokenHash.equals(deps.minter.hashOf(r.value.token))).toBe(true)
    expect(filas[0]!.tokenHash.toString('utf8')).not.toContain(r.value.token)
    expect(filas[0]!.pinHash.toString('utf8')).not.toContain(r.value.pin)
  })

  it('con el cupo lleno el siguiente se rechaza y no escribe nada', async () => {
    const { deps, filas } = dobles()
    for (const name of ['A', 'B', 'C']) await addPorter(deps)({ ...alta, name })
    const cuarto = await addPorter(deps)({ ...alta, name: 'D' })
    expect(isErr(cuarto) && cuarto.error.kind).toBe('limit_reached')
    expect(filas).toHaveLength(3)
  })

  it('un plan sin porteros (límite 0) no admite ninguno y lo dice', async () => {
    const { deps } = dobles()
    const r = await addPorter(deps)({ ...alta, limit: 0 })
    expect(isErr(r) && r.error.detail).toContain('no incluye personal de recepción')
  })

  it('un portero quitado deja su hueco libre', async () => {
    const { deps } = dobles()
    const ids: string[] = []
    for (const name of ['A', 'B', 'C']) {
      const r = await addPorter(deps)({ ...alta, name })
      if (isOk(r)) ids.push(r.value.id)
    }
    await revokePorter(deps)('e1', ids[0]!)
    expect(isOk(await addPorter(deps)({ ...alta, name: 'D' }))).toBe(true)
  })

  it('un dato inválido dice el campo y no escribe', async () => {
    const { deps, filas } = dobles()
    const r = await addPorter(deps)({ ...alta, name: ' ' })
    expect(isErr(r) && r.error.kind === 'invalid_field' && r.error.campo).toBe('name')
    expect(filas).toHaveLength(0)
  })
})

describe('entrar con PIN', () => {
  async function conPortero(ahora = DENTRO) {
    const d = dobles(ahora)
    const r = await addPorter(d.deps)(alta)
    if (!isOk(r)) throw new Error('alta')
    return { ...d, token: r.value.token, pin: r.value.pin, id: r.value.id }
  }

  it('con el PIN correcto dentro de la ventana entra a su evento', async () => {
    const { deps, token, pin, id } = await conPortero()
    const r = await enterWithPin(deps)({ token, pin })
    expect(isOk(r) && r.value.session).toMatchObject({ porterId: id, eventId: 'e1' })
  })

  it('entrar emite una sesión firmada, que no es el enlace', async () => {
    const { deps, token, pin } = await conPortero()
    const r = await enterWithPin(deps)({ token, pin })
    if (!isOk(r)) throw new Error('entrar')
    expect(r.value.cookie).not.toContain(token)
    expect(isOk(await resolvePorter(deps)(r.value.cookie))).toBe(true)
  })

  it('un PIN incorrecto responde «invalido», igual que un enlace desconocido', async () => {
    const { deps, token } = await conPortero()
    const malo = await enterWithPin(deps)({ token, pin: '000000' })
    const desconocido = await enterWithPin(deps)({ token: 'no-existe', pin: '123456' })
    expect(isErr(malo) && malo.error).toBe('invalido')
    expect(isErr(desconocido) && desconocido.error).toBe('invalido')
  })

  it('al quinto PIN incorrecto bloquea, aunque después acierte', async () => {
    const { deps, token, pin, filas } = await conPortero()
    for (let i = 0; i < MAX_INTENTOS_PIN; i++) await enterWithPin(deps)({ token, pin: '000000' })
    expect(filas[0]!.failedAttempts).toBe(MAX_INTENTOS_PIN)
    const r = await enterWithPin(deps)({ token, pin })
    expect(isErr(r) && r.error).toBe('bloqueado')
  })

  it('acertar reinicia los intentos fallidos', async () => {
    const { deps, token, pin, filas } = await conPortero()
    await enterWithPin(deps)({ token, pin: '000000' })
    await enterWithPin(deps)({ token, pin })
    expect(filas[0]!.failedAttempts).toBe(0)
  })

  it('fuera de la ventana no entra ni con el PIN correcto, y no gasta intentos', async () => {
    const { deps, token, pin, filas, mover } = await conPortero()
    mover(new Date('2026-10-20T20:00:00Z'))
    const r = await enterWithPin(deps)({ token, pin })
    expect(isErr(r) && r.error).toBe('fuera_de_horario')
    expect(filas[0]!.failedAttempts).toBe(0)
  })

  it('un portero quitado no entra', async () => {
    const { deps, token, pin, id } = await conPortero()
    await revokePorter(deps)('e1', id)
    const r = await enterWithPin(deps)({ token, pin })
    expect(isErr(r) && r.error).toBe('quitado')
  })
})

describe('resolvePorter', () => {
  /** Un portero que ya escribió su PIN: devuelve su enlace y su sesión. */
  async function dentro(ahora = DENTRO) {
    const d = dobles(ahora)
    const r = await addPorter(d.deps)(alta)
    if (!isOk(r)) throw new Error('alta')
    const entrada = await enterWithPin(d.deps)({ token: r.value.token, pin: r.value.pin })
    if (!isOk(entrada)) throw new Error('entrar')
    return { ...d, id: r.value.id, token: r.value.token, cookie: entrada.value.cookie }
  }

  it('con la sesión de la puerta abierta devuelve su evento, su nombre y su puerta', async () => {
    const { deps, cookie } = await dentro()
    const quien = await resolvePorter(deps)(cookie)
    expect(isOk(quien) && quien.value).toMatchObject({ eventId: 'e1', eventSlug: 'xv-valeria', name: 'Carlos', gate: 'Puerta 1' })
  })

  it('el enlace del portero NO abre la puerta: sin PIN no hay sesión', async () => {
    // F3/F4/F6: la cookie era el token del enlace, así que reenviarlo por WhatsApp daba
    // la lista de invitados con sus códigos y permitía registrar, corregir y anular ingresos.
    const { deps, token } = await dentro()
    const quien = await resolvePorter(deps)(token)
    expect(isErr(quien) && quien.error).toBe('invalido')
  })

  it('la sesión de otro servidor (otro secreto) no vale', async () => {
    const { deps, cookie } = await dentro()
    const otro = await resolvePorter({ ...deps, secreto: 'otro-secreto' })(cookie)
    expect(isErr(otro) && otro.error).toBe('invalido')
  })

  it('quitarlo corta también a quien ya estaba dentro', async () => {
    const { deps, cookie, id } = await dentro()
    await revokePorter(deps)('e1', id)
    const quien = await resolvePorter(deps)(cookie)
    expect(isErr(quien) && quien.error).toBe('quitado')
  })

  it('pasada la ventana, quien estaba dentro sale', async () => {
    const d = await dentro()
    // La ventana del 17 cierra a las 04:00Z del 18 más doce horas (`HORAS_DESPUES_POR_DEFECTO`);
    // la sesión aún no caduca —se emitió a las 20:00Z del 17 y dura 24 h—, así que lo que lo
    // saca es el horario, no la firma.
    d.mover(new Date('2026-10-18T17:00:00Z'))
    const quien = await resolvePorter(d.deps)(d.cookie)
    expect(isErr(quien) && quien.error).toBe('fuera_de_horario')
  })

  it('a las veinticuatro horas la sesión caduca aunque el evento siga abierto', async () => {
    const d = await dentro()
    d.mover(new Date(DENTRO.getTime() + 25 * 60 * 60 * 1000))
    const quien = await resolvePorter(d.deps)(d.cookie)
    expect(isErr(quien) && quien.error).toBe('invalido')
  })
})

describe('resolvePorterDelEnlace', () => {
  async function dosPorteros() {
    const d = dobles()
    const uno = await addPorter(d.deps)(alta)
    const otro = await addPorter(d.deps)({ ...alta, name: 'Marta' })
    if (!isOk(uno) || !isOk(otro)) throw new Error('alta')
    const entrada = await enterWithPin(d.deps)({ token: uno.value.token, pin: uno.value.pin })
    if (!isOk(entrada)) throw new Error('entrar')
    return { ...d, cookie: entrada.value.cookie, suyo: uno.value.token, ajeno: otro.value.token }
  }

  it('abre la puerta de su propio enlace', async () => {
    const { deps, cookie, suyo } = await dosPorteros()
    expect(isOk(await resolvePorterDelEnlace(deps)({ cookie, token: suyo }))).toBe(true)
  })

  it('con el enlace de otro portero no abre: la sesión es de un enlace, no de la plataforma', async () => {
    const { deps, cookie, ajeno } = await dosPorteros()
    const r = await resolvePorterDelEnlace(deps)({ cookie, token: ajeno })
    expect(isErr(r) && r.error).toBe('invalido')
  })
})

describe('listPorters y revokePorter', () => {
  it('lista solo los activos y no deja quitar un portero de otro evento', async () => {
    const { deps } = dobles()
    const r = await addPorter(deps)(alta)
    if (!isOk(r)) throw new Error('alta')
    expect(await revokePorter(deps)('otro-evento', r.value.id)).toBe(false)
    expect(await listPorters(deps)('e1')).toHaveLength(1)
    expect(await revokePorter(deps)('e1', r.value.id)).toBe(true)
    expect(await listPorters(deps)('e1')).toHaveLength(0)
  })
})
