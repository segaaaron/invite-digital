import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TallyStrip } from './TallyStrip'

describe('TallyStrip', () => {
  it('muestra confirmados sobre invitados, respondidos y pendientes', () => {
    render(<TallyStrip tally={{ seatsInvited: 7, seatsConfirmed: 3, groupsResponded: 2, groupsPending: 1 }} />)
    expect(screen.getByText('3 / 7')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('con el evento vacío muestra ceros, no huecos', () => {
    render(<TallyStrip tally={{ seatsInvited: 0, seatsConfirmed: 0, groupsResponded: 0, groupsPending: 0 }} />)
    expect(screen.getByText('0 / 0')).toBeInTheDocument()
  })
})
