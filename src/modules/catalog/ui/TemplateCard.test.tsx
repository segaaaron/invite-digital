import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { es } from '@/shared/i18n/messages/es'
import type { Template } from '../domain/template'
import { TemplateCard } from './TemplateCard'

const plantilla = (sample: Template['sample']): Template => ({
  id: 'perla',
  slug: 'perla',
  categorySlug: 'boda',
  categoryName: 'Boda',
  coverImagePath: '/templates/perla.avif',
  palette: { base: '#fdfaf4', accent: '#c19b4a' },
  sortOrder: 1,
  name: 'Perla',
  description: 'Modelo Perla',
  sample: sample,
})

const MUESTRA = {
  monogram: 'M & A',
  names: 'María\n& Alejandro',
  dateLabel: '12 · 10 · 2026',
  venue: 'Jardín Botánico Luna',
}

describe('TemplateCard', () => {
  it('enseña la portada del diseño, no una tarjeta dibujada', () => {
    // Lo que el cliente compra es la invitación, así que la tarjeta enseña su portada —lo
    // primero que verá el invitado—. Con la pieza dibujada, dos modelos distintos se veían
    // casi iguales: cambiaba el color del filete y poco más.
    render(<TemplateCard dictionary={es} locale="es" template={plantilla(MUESTRA)} />)

    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Perla')
    for (const dibujado of ['M & A', '12 · 10 · 2026', 'Jardín Botánico Luna']) {
      expect(screen.queryByText(dibujado), dibujado).not.toBeInTheDocument()
    }
  })

  it('mantiene el nombre del modelo como pie', () => {
    render(<TemplateCard dictionary={es} locale="es" template={plantilla(MUESTRA)} />)
    expect(screen.getByText('Perla')).toBeInTheDocument()
  })

  it('la tarjeta entera lleva a la invitación de ese mismo diseño', () => {
    // El `slug` de la plantilla es la clave del tema: enseñar uno y abrir otro sería
    // venderle al cliente un modelo distinto del que eligió.
    render(<TemplateCard dictionary={es} locale="es" template={plantilla(MUESTRA)} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/modelos/es/perla')
  })

  it('sin muestra cargada enseña su portada igual', () => {
    render(<TemplateCard dictionary={es} locale="es" template={plantilla(null)} />)
    expect(screen.getByRole('img')).toBeInTheDocument()
  })
})
