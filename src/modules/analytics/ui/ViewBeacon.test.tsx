import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { ViewBeacon } from './ViewBeacon'

const registrar = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@/app/_acciones/analytics/actions', () => ({ recordInvitationViewAction: registrar }))

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
    expect(registrar).toHaveBeenCalledWith(expect.objectContaining({ token: 'abc', kind: 'guest' }))
  })

  it('dos invitaciones distintas cuentan cada una la suya', () => {
    render(<ViewBeacon kind="guest" token="abc" />)
    render(<ViewBeacon kind="guest" token="xyz" />)
    expect(registrar).toHaveBeenCalledTimes(2)
  })

  it('manda la fuente que ve el navegador: el utm de la URL y el referente real', () => {
    // La acción no puede deducirla de sus propias cabeceras: el `Referer` de una Server
    // Action es la propia página de la invitación, así que TODA visita saldría como
    // «otras» y el panel de fuentes quedaría inservible sin un solo error.
    window.history.replaceState({}, '', '/i/abc?utm_source=whatsapp')
    render(<ViewBeacon kind="guest" token="con-utm" />)

    expect(registrar).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'con-utm', utmSource: 'whatsapp' }),
    )
  })

  it('no manda como referente el propio sitio: eso es una visita directa', () => {
    Object.defineProperty(document, 'referrer', { configurable: true, value: `${location.origin}/es` })
    window.history.replaceState({}, '', '/i/xyz')
    render(<ViewBeacon kind="guest" token="mismo-origen" />)

    expect(registrar).toHaveBeenCalledWith(expect.objectContaining({ referrer: null }))
  })

  it('no pinta nada', () => {
    const { container } = render(<ViewBeacon kind="client" token="abc" />)
    expect(container.innerHTML).toBe('')
  })
})
