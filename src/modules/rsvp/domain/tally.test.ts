import { describe, expect, it } from 'vitest'
import { tallyOf } from './tally'

describe('tallyOf', () => {
  it('cuenta cupos invitados, confirmados, respondidos y pendientes', () => {
    expect(
      tallyOf([
        { seats: 4, attending: 3 },
        { seats: 2, attending: 0 },
        { seats: 1, attending: null },
      ]),
    ).toEqual({ seatsInvited: 7, seatsConfirmed: 3, groupsResponded: 2, groupsPending: 1 })
  })

  it('un grupo que respondió cero cuenta como respondido, no como pendiente', () => {
    expect(tallyOf([{ seats: 3, attending: 0 }])).toMatchObject({ groupsResponded: 1, groupsPending: 0 })
  })

  it('sin grupos, todo en cero', () => {
    expect(tallyOf([])).toEqual({ seatsInvited: 0, seatsConfirmed: 0, groupsResponded: 0, groupsPending: 0 })
  })
})
