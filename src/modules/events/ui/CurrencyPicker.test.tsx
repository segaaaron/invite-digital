import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CurrencyPicker } from './CurrencyPicker'

const cambiar = vi.hoisted(() => vi.fn())
vi.mock('../actions', () => ({ setEventCurrencyAction: cambiar }))

describe('CurrencyPicker', () => {
  it('si el servidor rechaza el cambio, lo dice y vuelve a la moneda anterior', async () => {
    // El selector se queda con la moneda nueva y el evento con la vieja: la mesa de
    // regalos del invitado seguiría en la otra moneda sin que nadie se entere.
    cambiar.mockImplementation(async () => ({ status: 'error', message: 'No se pudo guardar la moneda.' }))
    render(<CurrencyPicker current="BOB" eventId="e1" eventSlug="boda" />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'USD' } })

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/no se pudo guardar la moneda/i))
    expect(screen.getByRole('combobox')).toHaveValue('BOB')
  })
})
