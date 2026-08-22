import { describe, expect, it } from 'vitest'
import { isErr, isOk, type Result } from '@/shared/result'
import type { RegistryError, RegistryErrorKind } from '../domain/errors'
import type { Contribution, Fund } from '../domain/fund'
import { fakeRegistryRepository } from './fake-registry-repository'
import { addFund, recordContribution, removeFund, updateFund } from './fund-use-cases'

const EVENTO = 'e1'
const OTRO_EVENTO = 'e2'
const AHORA = new Date('2026-08-21T12:00:00.000Z')

let contador = 0
const ids = () => `id-${(contador += 1)}`

const fondo = (over: Partial<Fund> = {}): Fund => ({
  id: 'f1',
  eventId: EVENTO,
  name: 'Luna de miel',
  description: null,
  goalCents: 100_000,
  ...over,
})

const aporte = (over: Partial<Contribution> = {}): Contribution => ({
  id: 'c1',
  fundId: 'f1',
  guestGroupId: null,
  displayName: 'Abuela Rosa',
  amountCents: 15_000,
  method: 'envelope',
  message: null,
  createdAt: AHORA,
  ...over,
})

const falla = <T>(result: Result<T, RegistryError>, kind: RegistryErrorKind) => {
  if (isOk(result)) throw new Error(`Se esperaba ${kind}, pero salió bien`)
  expect(result.error.kind).toBe(kind)
}

const valor = <T>(result: Result<T, RegistryError>): T => {
  if (isErr(result)) throw new Error(`Se esperaba éxito, llegó ${result.error.kind}: ${result.error.detail}`)
  return result.value
}

describe('addFund', () => {
  it('abre el fondo con su meta', async () => {
    const fake = fakeRegistryRepository({})
    const f = valor(
      await addFund({ registry: fake.repo, ids })({
        eventId: EVENTO,
        name: 'Luna de miel',
        description: 'Pasajes y hotel.',
        goalCents: 500_000,
      }),
    )
    expect(f.goalCents).toBe(500_000)
    expect(fake.funds).toHaveLength(1)
  })

  it('rechaza una meta de cero antes de tocar la base', async () => {
    const fake = fakeRegistryRepository({})
    falla(
      await addFund({ registry: fake.repo, ids })({ eventId: EVENTO, name: 'Luna de miel', description: null, goalCents: 0 }),
      'invalid_amount',
    )
    expect(fake.funds).toHaveLength(0)
  })

  it('rechaza el nombre vacío', async () => {
    const fake = fakeRegistryRepository({})
    falla(
      await addFund({ registry: fake.repo, ids })({ eventId: EVENTO, name: ' ', description: null, goalCents: 100 }),
      'invalid_name',
    )
  })
})

describe('updateFund', () => {
  it('cambia el nombre y la meta', async () => {
    const fake = fakeRegistryRepository({ funds: [fondo()] })
    const f = valor(
      await updateFund({ registry: fake.repo })({
        id: 'f1',
        eventId: EVENTO,
        name: 'Luna de miel en Rurrenabaque',
        description: null,
        goalCents: 250_000,
      }),
    )
    expect(f.name).toBe('Luna de miel en Rurrenabaque')
    expect(fake.funds[0]?.goalCents).toBe(250_000)
  })

  it('un fondo de otro evento da wrong_event', async () => {
    const fake = fakeRegistryRepository({ funds: [fondo({ eventId: OTRO_EVENTO })] })
    falla(
      await updateFund({ registry: fake.repo })({
        id: 'f1',
        eventId: EVENTO,
        name: 'Otro',
        description: null,
        goalCents: 100,
      }),
      'wrong_event',
    )
  })

  it('un fondo que no existe da not_found', async () => {
    const fake = fakeRegistryRepository({})
    falla(
      await updateFund({ registry: fake.repo })({
        id: 'fantasma',
        eventId: EVENTO,
        name: 'Otro',
        description: null,
        goalCents: 100,
      }),
      'not_found',
    )
  })
})

describe('removeFund', () => {
  it('borrar el fondo arrastra sus contribuciones', async () => {
    const fake = fakeRegistryRepository({
      funds: [fondo()],
      contributions: [aporte({ id: 'c1' }), aporte({ id: 'c2' })],
    })
    const r = valor(await removeFund({ registry: fake.repo })({ id: 'f1', eventId: EVENTO }))
    expect(r.contributions).toBe(2)
    expect(fake.funds).toHaveLength(0)
    expect(fake.contributions).toHaveLength(0)
  })

  it('dice cuántas aportaciones se lleva por delante, para poder pedir confirmación', async () => {
    const fake = fakeRegistryRepository({ funds: [fondo()], contributions: [aporte()] })
    expect(valor(await removeFund({ registry: fake.repo })({ id: 'f1', eventId: EVENTO })).contributions).toBe(1)
  })

  it('no borra el fondo de otro evento', async () => {
    const fake = fakeRegistryRepository({ funds: [fondo({ eventId: OTRO_EVENTO })] })
    falla(await removeFund({ registry: fake.repo })({ id: 'f1', eventId: EVENTO }), 'wrong_event')
    expect(fake.funds).toHaveLength(1)
  })
})

describe('recordContribution', () => {
  const deps = (fake: ReturnType<typeof fakeRegistryRepository>) => ({
    registry: fake.repo,
    ids,
    clock: () => AHORA,
  })

  it('registra lo que llegó al fondo', async () => {
    const fake = fakeRegistryRepository({ funds: [fondo()] })
    const c = valor(
      await recordContribution(deps(fake))({
        eventId: EVENTO,
        fundId: 'f1',
        guestGroupId: null,
        displayName: 'Abuela Rosa',
        amountCents: 15_000,
        method: 'envelope',
        message: 'Que sean muy felices.',
      }),
    )
    expect(c.amountCents).toBe(15_000)
    expect(c.createdAt).toEqual(AHORA)
    expect(fake.contributions).toHaveLength(1)
  })

  it('acepta una aportación sin grupo: la abuela del sobre no tiene enlace', async () => {
    const fake = fakeRegistryRepository({ funds: [fondo()] })
    const c = valor(
      await recordContribution(deps(fake))({
        eventId: EVENTO,
        fundId: 'f1',
        guestGroupId: null,
        displayName: 'Abuela Rosa',
        amountCents: 5_000,
        method: 'envelope',
        message: null,
      }),
    )
    expect(c.guestGroupId).toBeNull()
  })

  it('rechaza un importe de cero antes de tocar la base', async () => {
    const fake = fakeRegistryRepository({ funds: [fondo()] })
    falla(
      await recordContribution(deps(fake))({
        eventId: EVENTO,
        fundId: 'f1',
        guestGroupId: null,
        displayName: 'Abuela Rosa',
        amountCents: 0,
        method: 'envelope',
        message: null,
      }),
      'invalid_amount',
    )
    expect(fake.contributions).toHaveLength(0)
  })

  it('no registra nada en el fondo de otro evento', async () => {
    const fake = fakeRegistryRepository({ funds: [fondo({ eventId: OTRO_EVENTO })] })
    falla(
      await recordContribution(deps(fake))({
        eventId: EVENTO,
        fundId: 'f1',
        guestGroupId: null,
        displayName: 'Abuela Rosa',
        amountCents: 5_000,
        method: 'envelope',
        message: null,
      }),
      'wrong_event',
    )
    expect(fake.contributions).toHaveLength(0)
  })

  it('un fondo inexistente da not_found', async () => {
    const fake = fakeRegistryRepository({})
    falla(
      await recordContribution(deps(fake))({
        eventId: EVENTO,
        fundId: 'fantasma',
        guestGroupId: null,
        displayName: 'Abuela Rosa',
        amountCents: 5_000,
        method: 'envelope',
        message: null,
      }),
      'not_found',
    )
  })
})
