import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ThemePicker } from './ThemePicker'

const TEMAS = [
  {
    key: 'boda',
    label: 'Étoile',
    categorySlug: 'boda' as const,
    palette: { fondo: '#08070d', oro: '#d4b483' },
    sample: { monogram: 'C & M', names: 'Camila\n& Mateo' },
  },
  {
    key: 'xv',
    label: 'Bajo el Mar',
    categorySlug: 'xv-anos' as const,
    palette: { papel: '#f3ecff', lila: '#c98ad0' },
    sample: { monogram: 'S', names: 'Sofía' },
  },
]

describe('ThemePicker', () => {
  it('bodas y XV no se mezclan: se ve un tipo de fiesta a la vez', () => {
    render(<ThemePicker defaultValue="boda" definitions={TEMAS} locale="es" />)
    expect(screen.getByRole('button', { name: 'Bodas' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText('Bajo el Mar')).not.toBeInTheDocument()

    // Cambiar de tipo elige el primero del nuevo: no queda elegida una boda fuera de la vista.
    fireEvent.click(screen.getByRole('button', { name: 'XV años' }))
    expect(screen.queryByText('Étoile')).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { checked: true })).toHaveAttribute('value', 'xv')
  })

  it('con diseños de una sola fiesta —editar un evento— no ofrece cambiar de tipo', () => {
    render(<ThemePicker defaultValue="xv" definitions={TEMAS.filter((t) => t.key === 'xv')} locale="es" />)
    expect(screen.queryByRole('button', { name: 'Bodas' })).not.toBeInTheDocument()
  })

  it('la selección va en un radio de verdad, con el nombre que el formulario espera', () => {
    // Un div con estado no se envía, no funciona con teclado y no funciona sin
    // JavaScript. El formulario del evento espera `themeKey`.
    render(<ThemePicker defaultValue="boda" definitions={TEMAS} locale="es" />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(1)
    expect(radios.every((radio) => radio.getAttribute('name') === 'themeKey')).toBe(true)
  })

  it('marca el tema que el evento ya tiene', () => {
    render(<ThemePicker defaultValue="xv" definitions={TEMAS} locale="es" />)
    expect(screen.getByRole('radio', { checked: true })).toHaveAttribute('value', 'xv')
  })

  it('cada tarjeta enlaza a la invitación entera, en el idioma del evento', () => {
    // El atelier decide mirándola, no leyendo el nombre.
    render(<ThemePicker defaultValue="boda" definitions={TEMAS} locale="en" />)
    const enlaces = screen.getAllByRole('link', { name: 'Ver' })
    expect(enlaces[0]).toHaveAttribute('href', '/modelos/en/boda')
    expect(enlaces[0]).toHaveAttribute('target', '_blank')
  })

  it('parte los nombres por sus saltos de línea, como el papel del catálogo', () => {
    render(<ThemePicker defaultValue="boda" definitions={TEMAS} locale="es" />)
    expect(screen.getByText('Camila')).toBeInTheDocument()
    expect(screen.getByText('& Mateo')).toBeInTheDocument()
  })

  it('un tema sin muestra cae a su nombre y no deja la tarjeta vacía', () => {
    render(
      <ThemePicker
        defaultValue="clasico"
        definitions={[{ key: 'clasico', label: 'Clásico marfil', categorySlug: 'boda', palette: {}, sample: null }]}
        locale="es"
      />,
    )
    expect(screen.getAllByText('Clásico marfil').length).toBeGreaterThan(0)
  })
})
