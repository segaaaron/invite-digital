import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PassQr } from './PassQr'

describe('PassQr', () => {
  it('dibuja un QR con la dirección del pase', async () => {
    render(await PassQr({
        url: 'https://invitepremium.bo/i/AbCdEfGhIjKlMnOpQrStUv',
        label: 'Familia Rojas Peña',
        labels: { title: 'Pase de entrada', hint: 'Muéstralo en la entrada.', alt: 'Pase de entrada de' },
      }))
    expect(screen.getByRole('img', { name: /pase de entrada/i })).toBeInTheDocument()
  })

  it('el dibujo no sale en blanco: un QR vacío pasaría las demás pruebas', async () => {
    const { container } = render(
      await PassQr({
        url: 'https://invitepremium.bo/i/AbCdEfGhIjKlMnOpQrStUv',
        label: 'Familia Rojas Peña',
        labels: { title: 'Pase de entrada', hint: 'Muéstralo en la entrada.', alt: 'Pase de entrada de' },
      }),
    )
    const path = container.querySelector('svg path')?.getAttribute('d') ?? ''
    expect(path.length).toBeGreaterThan(500)
  })

  it('nunca imprime el token como texto legible', async () => {
    const { container } = render(
      await PassQr({
        url: 'https://invitepremium.bo/i/AbCdEfGhIjKlMnOpQrStUv',
        label: 'Familia Rojas Peña',
        labels: { title: 'Pase de entrada', hint: 'Muéstralo en la entrada.', alt: 'Pase de entrada de' },
      }),
    )
    expect(container.textContent).not.toContain('AbCdEfGhIjKlMnOpQrStUv')
  })
})
