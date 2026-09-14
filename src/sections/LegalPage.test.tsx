import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LegalText, PrivacyNotice } from './LegalPage'

describe('LegalText', () => {
  it('## es un título y lo demás son párrafos separados por línea en blanco', () => {
    render(<LegalText texto={'## Qué datos\nNombre y\nteléfono.\n\nOtro párrafo.'} />)
    expect(screen.getByRole('heading', { name: 'Qué datos' })).toBeInTheDocument()
    expect(screen.getByText('Nombre y teléfono.')).toBeInTheDocument()
    expect(screen.getByText('Otro párrafo.')).toBeInTheDocument()
  })

  it('no interpreta HTML: lo que escribe el admin sale como texto', () => {
    const { container } = render(<LegalText texto={'<script>alert(1)</script>'} />)
    expect(container.querySelector('script')).toBeNull()
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument()
  })
})

describe('PrivacyNotice', () => {
  it('sin política publicada no enlaza a ninguna parte', () => {
    const { container } = render(<PrivacyNotice enlace="política" href={null} texto="Al enviar" />)
    expect(container).toBeEmptyDOMElement()
  })
})
