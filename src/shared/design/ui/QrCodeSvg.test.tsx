import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { QrCodeSvg } from './QrCodeSvg'

describe('QrCodeSvg', () => {
  it('dibuja el código con el rótulo que se le da', () => {
    render(<QrCodeSvg label="Pase de Ana Lucía Vega" url="https://invitepremium.bo/i/TOKEN" />)

    expect(screen.getByRole('img', { name: 'Pase de Ana Lucía Vega' })).toBeInTheDocument()
  })

  it('no incrusta ni un color hexadecimal: el color lo pone la hoja de estilos', () => {
    const { container } = render(<QrCodeSvg label="Enlace" url="https://invitepremium.bo/i/TOKEN" />)

    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(container.querySelector('path')).toHaveAttribute('fill', 'currentColor')
  })

  it('deja un margen de silencio alrededor: sin él algunos lectores no enfocan', () => {
    const { container } = render(<QrCodeSvg label="Enlace" url="https://invitepremium.bo/i/TOKEN" />)

    const viewBox = container.querySelector('svg')?.getAttribute('viewBox')
    const [, , ancho] = (viewBox ?? '').split(' ').map(Number)
    const primero = container.querySelector('path')?.getAttribute('d') ?? ''

    // El primer módulo pintado nunca está en la columna cero ni en la fila cero.
    expect(ancho).toBeGreaterThan(21)
    expect(primero.startsWith('M0 0')).toBe(false)
  })

  it('dos URL distintas dan dos dibujos distintos', () => {
    const { container: uno } = render(<QrCodeSvg label="A" url="https://invitepremium.bo/i/AAA" />)
    const { container: dos } = render(<QrCodeSvg label="B" url="https://invitepremium.bo/i/BBB" />)

    expect(uno.querySelector('path')?.getAttribute('d')).not.toBe(dos.querySelector('path')?.getAttribute('d'))
  })
})
