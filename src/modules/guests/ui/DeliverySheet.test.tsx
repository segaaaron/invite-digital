import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DeliverySheet } from './DeliverySheet'

const TARJETAS = [
  { label: 'Familia Rojas Peña', url: 'https://invitepremium.bo/i/AAA' },
  { label: 'Ana Lucía Vega', url: 'https://invitepremium.bo/i/BBB' },
]

describe('DeliverySheet', () => {
  it('un código QR digital por invitación, para descargar o compartir; nada que imprimir', () => {
    render(<DeliverySheet cards={TARJETAS} eventTitle="María & Alejandro" />)
    const tarjetas = screen.getAllByRole('listitem')
    expect(tarjetas).toHaveLength(2)
    expect(within(tarjetas[0]!).getByRole('img', { name: 'Código QR de Familia Rojas Peña' })).toBeInTheDocument()
    expect(within(tarjetas[0]!).getByRole('button', { name: 'Descargar QR' })).toBeInTheDocument()
    expect(within(tarjetas[0]!).getByRole('button', { name: 'Compartir QR' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /imprimir/i })).toBeNull()
  })
})
