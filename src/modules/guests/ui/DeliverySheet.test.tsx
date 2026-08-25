import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DeliverySheet } from './DeliverySheet'

const TARJETAS = [
  { label: 'Familia Rojas Peña', url: 'https://invitepremium.bo/i/AAA' },
  { label: 'Ana Lucía Vega', url: 'https://invitepremium.bo/i/BBB' },
]

afterEach(() => {
  delete document.body.dataset.imprimiendo
  vi.restoreAllMocks()
})

describe('DeliverySheet', () => {
  it('pinta una tarjeta por enlace, con su QR y su dirección', () => {
    render(<DeliverySheet cards={TARJETAS} eventTitle="María & Alejandro" />)

    const tarjetas = screen.getAllByRole('listitem')
    expect(tarjetas).toHaveLength(2)
    expect(within(tarjetas[0]!).getByRole('img', { name: 'Invitación de Familia Rojas Peña' })).toBeInTheDocument()
    expect(within(tarjetas[0]!).getByText('https://invitepremium.bo/i/AAA')).toBeInTheDocument()
    expect(within(tarjetas[1]!).getByRole('img', { name: 'Invitación de Ana Lucía Vega' })).toBeInTheDocument()
  })

  it('marca el cuerpo antes de imprimir y lo desmarca después', () => {
    // `window.print` no existe en jsdom; sin el doble, el clic revienta.
    const imprimir = vi.fn(() => {
      // Mientras el navegador dibuja el papel, la marca tiene que estar puesta: es lo
      // único que esconde el resto del panel.
      expect(document.body.dataset.imprimiendo).toBe('tarjeta')
    })
    vi.stubGlobal('print', imprimir)

    render(<DeliverySheet cards={TARJETAS} eventTitle="María & Alejandro" />)
    fireEvent.click(screen.getByRole('button', { name: /imprimir/i }))

    expect(imprimir).toHaveBeenCalledOnce()
    expect(document.body.dataset.imprimiendo).toBeUndefined()
  })

  it('el botón no sale en el papel: nadie pulsa una hoja impresa', () => {
    render(<DeliverySheet cards={TARJETAS} eventTitle="María & Alejandro" />)

    expect(screen.getByRole('button', { name: /imprimir/i }).className).toContain('print:hidden')
  })

  it('sin enlaces no pinta hoja ninguna', () => {
    const { container } = render(<DeliverySheet cards={[]} eventTitle="María & Alejandro" />)

    expect(container).toBeEmptyDOMElement()
  })
})
