import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { ViewBeacon } from './ViewBeacon'

const registrar = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('../actions', () => ({ recordInvitationViewAction: registrar }))

describe('ViewBeacon', () => {
  beforeEach(() => {
    registrar.mockClear()
    sessionStorage.clear()
  })

  it('registra la visita una sola vez por pestaña', () => {
    // Sin el guardo, cada navegación interna sumaría una visita y el contador diría
    // cinco donde hubo una.
    const { unmount } = render(<ViewBeacon kind="guest" token="abc" />)
    unmount()
    render(<ViewBeacon kind="guest" token="abc" />)

    expect(registrar).toHaveBeenCalledTimes(1)
    expect(registrar).toHaveBeenCalledWith({ token: 'abc', kind: 'guest' })
  })

  it('dos invitaciones distintas cuentan cada una la suya', () => {
    render(<ViewBeacon kind="guest" token="abc" />)
    render(<ViewBeacon kind="guest" token="xyz" />)
    expect(registrar).toHaveBeenCalledTimes(2)
  })

  it('no pinta nada', () => {
    const { container } = render(<ViewBeacon kind="client" token="abc" />)
    expect(container.innerHTML).toBe('')
  })
})
