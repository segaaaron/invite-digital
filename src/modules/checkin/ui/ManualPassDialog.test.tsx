import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { DoorManifestGroup } from '../application/get-door-manifest'
import { sha256Hex } from './local-resolve'
import { ManualPassDialog } from './ManualPassDialog'

// Veintidós caracteres de base64url: la forma que `parsePass` exige. Un código con
// guiones sueltos no es un pase y la prueba pasaría por el motivo equivocado.
const CODIGO = 'aB3dEfGhIjKlMnOpQrStUv'

async function grupos(): Promise<DoorManifestGroup[]> {
  return [
    {
      id: 'g1',
      label: 'Familia Ruiz',
      leadName: 'Valentina Ruiz',
      seats: 3,
      attending: 3,
      revoked: false,
      tableLabel: null,
      tokenHashHex: await sha256Hex(CODIGO),
      people: [],
    },
  ]
}

const pintar = async (onConfirm = vi.fn()) => {
  render(
    <ManualPassDialog arrivedIds={new Set()} groups={await grupos()} onClose={vi.fn()} onConfirm={onConfirm} />,
  )
  return onConfirm
}

describe('ManualPassDialog', () => {
  it('no registra nada al buscar: primero enseña a quién va a dejar entrar', async () => {
    const onConfirm = await pintar()

    fireEvent.change(screen.getByPlaceholderText(/código del pase/i), { target: { value: CODIGO } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))

    // Este es el punto de la pantalla: entre teclear y registrar hay un paso donde se
    // coteja el nombre con quien tienes delante.
    await waitFor(() => expect(screen.getByText('Valentina Ruiz y 2 acompañantes')).toBeInTheDocument())
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('registra solo al confirmar, y devuelve el código tecleado', async () => {
    const onConfirm = await pintar()

    fireEvent.change(screen.getByPlaceholderText(/código del pase/i), { target: { value: CODIGO } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    await waitFor(() => screen.getByRole('button', { name: /registrar ingreso/i }))
    fireEvent.click(screen.getByRole('button', { name: /registrar ingreso/i }))

    expect(onConfirm).toHaveBeenCalledWith(CODIGO)
  })

  it('un código que no es del evento lo dice y no ofrece registrar', async () => {
    const onConfirm = await pintar()

    fireEvent.change(screen.getByPlaceholderText(/código del pase/i), { target: { value: 'zZ9yXwVuTsRqPoNmLkJiHg' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/no es de este evento/i))
    expect(screen.queryByRole('button', { name: /registrar ingreso/i })).not.toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('sin personas cargadas cae a la etiqueta del grupo', async () => {
    const sinPersonas = (await grupos()).map((g) => ({ ...g, leadName: null }))
    render(
      <ManualPassDialog arrivedIds={new Set()} groups={sinPersonas} onClose={vi.fn()} onConfirm={vi.fn()} />,
    )

    fireEvent.change(screen.getByPlaceholderText(/código del pase/i), { target: { value: CODIGO } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))

    await waitFor(() => expect(screen.getByText('Familia Ruiz')).toBeInTheDocument())
  })
})
