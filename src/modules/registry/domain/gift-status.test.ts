import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import type { RegistryErrorKind } from './errors'
import type { Gift } from './gift'
import { canTransition, type GiftActor, type GiftStatus, transitionGift } from './gift-status'

const ATELIER: GiftActor = { kind: 'atelier' }
const ANA: GiftActor = { kind: 'guest', groupId: 'grupo-ana' }
const BRUNO: GiftActor = { kind: 'guest', groupId: 'grupo-bruno' }

const AHORA = new Date('2026-08-21T12:00:00.000Z')

const regalo = (over: Partial<Gift> = {}): Gift => ({
  id: 'g1',
  eventId: 'e1',
  name: 'Cafetera italiana',
  priceCents: 45000,
  store: 'Casa Ideal',
  url: 'https://casaideal.bo/cafetera',
  status: 'available',
  claimedByGroupId: null,
  claimedAt: null,
  ...over,
})

const reservadoPor = (groupId: string): Gift =>
  regalo({ status: 'reserved', claimedByGroupId: groupId, claimedAt: new Date('2026-08-20T10:00:00.000Z') })

const fallaCon = (result: ReturnType<typeof transitionGift>, kind: RegistryErrorKind) => {
  if (isOk(result)) throw new Error(`Se esperaba ${kind}, pero la transición se permitió`)
  expect(result.error.kind).toBe(kind)
}

const valor = (result: ReturnType<typeof transitionGift>): Gift => {
  if (isErr(result)) throw new Error(`Se esperaba éxito, llegó ${result.error.kind}: ${result.error.detail}`)
  return result.value
}

describe('canTransition', () => {
  it('el invitado reserva lo que está disponible', () => {
    expect(canTransition('available', 'reserved', ANA)).toBe(true)
  })

  it('el atelier no reserva en nombre de nadie: la reserva es del invitado', () => {
    expect(canTransition('available', 'reserved', ATELIER)).toBe(false)
  })

  it('lo reservado se puede liberar, lo mande quien lo mande', () => {
    expect(canTransition('reserved', 'available', ANA)).toBe(true)
    expect(canTransition('reserved', 'available', ATELIER)).toBe(true)
  })

  it('solo el atelier marca comprado, y desde cualquiera de los dos estados', () => {
    expect(canTransition('available', 'purchased', ATELIER)).toBe(true)
    expect(canTransition('reserved', 'purchased', ATELIER)).toBe(true)
    expect(canTransition('available', 'purchased', ANA)).toBe(false)
    expect(canTransition('reserved', 'purchased', ANA)).toBe(false)
  })

  it('comprado es definitivo: no vuelve a ningún estado, ni para el atelier', () => {
    const destinos: GiftStatus[] = ['available', 'reserved', 'purchased']
    for (const destino of destinos) {
      expect(canTransition('purchased', destino, ATELIER)).toBe(false)
      expect(canTransition('purchased', destino, ANA)).toBe(false)
    }
  })

  it('reservar lo ya reservado no es una transición', () => {
    expect(canTransition('reserved', 'reserved', ANA)).toBe(false)
    expect(canTransition('reserved', 'reserved', ATELIER)).toBe(false)
  })
})

describe('transitionGift', () => {
  it('el invitado reserva un disponible y queda a su nombre', () => {
    const g = valor(transitionGift(regalo(), 'reserved', ANA, AHORA))
    expect(g.status).toBe('reserved')
    expect(g.claimedByGroupId).toBe('grupo-ana')
    expect(g.claimedAt).toEqual(AHORA)
  })

  it('reservar uno ya reservado da already_claimed', () => {
    fallaCon(transitionGift(reservadoPor('grupo-ana'), 'reserved', BRUNO, AHORA), 'already_claimed')
  })

  it('reservar el que uno mismo reservó tampoco vale: ya es suyo', () => {
    fallaCon(transitionGift(reservadoPor('grupo-ana'), 'reserved', ANA, AHORA), 'already_claimed')
  })

  it('el invitado NO puede liberar el regalo que reservó otro', () => {
    // Sin esta regla, cualquiera con un enlace válido libera el regalo de otro.
    fallaCon(transitionGift(reservadoPor('grupo-ana'), 'available', BRUNO, AHORA), 'not_yours')
  })

  it('el invitado sí libera el suyo, y el regalo vuelve a estar libre del todo', () => {
    const g = valor(transitionGift(reservadoPor('grupo-ana'), 'available', ANA, AHORA))
    expect(g.status).toBe('available')
    expect(g.claimedByGroupId).toBeNull()
    expect(g.claimedAt).toBeNull()
  })

  it('el atelier libera cualquiera, sea de quien sea', () => {
    const g = valor(transitionGift(reservadoPor('grupo-ana'), 'available', ATELIER, AHORA))
    expect(g.status).toBe('available')
    expect(g.claimedByGroupId).toBeNull()
  })

  it('liberar lo que ya está libre no falla: el estado pedido ya es el que hay', () => {
    const g = valor(transitionGift(regalo(), 'available', ATELIER, AHORA))
    expect(g.status).toBe('available')
  })

  it('el atelier marca comprado lo reservado y conserva quién lo reservó', () => {
    // Se conserva para poder agradecer: el regalo ya no está en juego, pero quién lo
    // trajo sigue siendo un dato que la pareja necesita.
    const g = valor(transitionGift(reservadoPor('grupo-ana'), 'purchased', ATELIER, AHORA))
    expect(g.status).toBe('purchased')
    expect(g.claimedByGroupId).toBe('grupo-ana')
  })

  it('el atelier marca comprado uno que llegó sin reservar', () => {
    const g = valor(transitionGift(regalo(), 'purchased', ATELIER, AHORA))
    expect(g.status).toBe('purchased')
    expect(g.claimedByGroupId).toBeNull()
  })

  it('el invitado no marca comprado nada', () => {
    fallaCon(transitionGift(regalo(), 'purchased', ANA, AHORA), 'not_yours')
    fallaCon(transitionGift(reservadoPor('grupo-ana'), 'purchased', ANA, AHORA), 'not_yours')
  })

  it('el invitado no reserva en nombre del atelier ni al revés', () => {
    fallaCon(transitionGift(regalo(), 'reserved', ATELIER, AHORA), 'not_yours')
  })

  it('comprado no vuelve atrás, ni para el atelier', () => {
    const comprado = regalo({ status: 'purchased' })
    fallaCon(transitionGift(comprado, 'available', ATELIER, AHORA), 'already_purchased')
    fallaCon(transitionGift(comprado, 'reserved', ANA, AHORA), 'already_purchased')
    fallaCon(transitionGift(comprado, 'purchased', ATELIER, AHORA), 'already_purchased')
  })

  it('no muta el regalo que recibe', () => {
    const original = regalo()
    transitionGift(original, 'reserved', ANA, AHORA)
    expect(original.status).toBe('available')
    expect(original.claimedByGroupId).toBeNull()
  })
})
