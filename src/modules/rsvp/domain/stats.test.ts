import { describe, expect, it } from 'vitest'
import { eventStatsOf } from './stats'

describe('eventStatsOf', () => {
  it('separa a los que asisten, a los que no y a los que no respondieron', () => {
    const stats = eventStatsOf([
      { seats: 4, attending: 3 },
      { seats: 2, attending: 0 },
      { seats: 3, attending: null },
      { seats: 1, attending: 1 },
    ])

    expect(stats).toMatchObject({
      groupsInvited: 4,
      groupsAttending: 2,
      groupsDeclined: 1,
      groupsPending: 1,
      groupsResponded: 3,
      seatsInvited: 10,
      seatsConfirmed: 4,
    })
  })

  it('responder cero es responder «no vamos», no quedarse pendiente', () => {
    // Confundirlos haría que el atelier persiguiera a quien ya contestó.
    const stats = eventStatsOf([{ seats: 3, attending: 0 }])
    expect(stats).toMatchObject({ groupsDeclined: 1, groupsPending: 0, groupsResponded: 1 })
  })

  it('los tres porcentajes del desglose suman exactamente 100', () => {
    const stats = eventStatsOf([
      { seats: 1, attending: 1 },
      { seats: 1, attending: 1 },
      { seats: 1, attending: 0 },
      { seats: 1, attending: null },
      { seats: 1, attending: null },
      { seats: 1, attending: null },
      { seats: 1, attending: null },
    ])

    expect((stats.attendingPercent ?? 0) + (stats.declinedPercent ?? 0) + (stats.pendingPercent ?? 0)).toBe(100)
  })

  it('con tres tercios el reparto sigue sumando 100, no 99', () => {
    // Redondear cada parte por su cuenta daría 33 + 33 + 33 = 99 y faltaría un punto.
    const stats = eventStatsOf([
      { seats: 1, attending: 1 },
      { seats: 1, attending: 0 },
      { seats: 1, attending: null },
    ])

    expect((stats.attendingPercent ?? 0) + (stats.declinedPercent ?? 0) + (stats.pendingPercent ?? 0)).toBe(100)
  })

  it('sin invitados no hay porcentajes: son null, nunca NaN', () => {
    const stats = eventStatsOf([])

    expect(stats.empty).toBe(true)
    expect(stats.attendingPercent).toBeNull()
    expect(stats.declinedPercent).toBeNull()
    expect(stats.pendingPercent).toBeNull()
    expect(stats.respondedPercent).toBeNull()
    expect(stats.seatsConfirmedPercent).toBeNull()
    expect(stats.groupsInvited).toBe(0)
  })

  it('con invitados pero sin cupos declarados el porcentaje de cupos es null, no una división por cero', () => {
    const stats = eventStatsOf([{ seats: 0, attending: null }])
    expect(stats.empty).toBe(false)
    expect(stats.seatsConfirmedPercent).toBeNull()
    expect(stats.pendingPercent).toBe(100)
  })

  it('los porcentajes son enteros de 0 a 100', () => {
    const stats = eventStatsOf([
      { seats: 2, attending: 2 },
      { seats: 2, attending: null },
    ])

    for (const p of [stats.attendingPercent, stats.declinedPercent, stats.pendingPercent, stats.respondedPercent]) {
      expect(Number.isInteger(p)).toBe(true)
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThanOrEqual(100)
    }
  })

  it('el porcentaje que respondió es lo que no queda pendiente', () => {
    const stats = eventStatsOf([
      { seats: 1, attending: 1 },
      { seats: 1, attending: null },
      { seats: 1, attending: null },
      { seats: 1, attending: null },
    ])

    expect(stats.pendingPercent).toBe(75)
    expect(stats.respondedPercent).toBe(25)
  })

  it('todos confirmados es el 100 % y ningún pendiente', () => {
    const stats = eventStatsOf([
      { seats: 2, attending: 2 },
      { seats: 3, attending: 3 },
    ])

    expect(stats).toMatchObject({ attendingPercent: 100, declinedPercent: 0, pendingPercent: 0, respondedPercent: 100 })
    expect(stats.seatsConfirmedPercent).toBe(100)
  })

  it('los cupos confirmados se miden contra los invitados, no contra los que respondieron', () => {
    const stats = eventStatsOf([
      { seats: 4, attending: 2 },
      { seats: 4, attending: null },
    ])

    expect(stats.seatsConfirmedPercent).toBe(25)
  })
})
