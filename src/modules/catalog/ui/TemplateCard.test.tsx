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
  it('dibuja la invitación de muestra, no una fotografía', () => {
    // La maqueta compone la pieza: categoría, monograma, nombres, fecha y lugar. Una foto
    // de relleno no enseña el modelo, que es lo que el cliente viene a ver.
    render(<TemplateCard dictionary={es} template={plantilla(MUESTRA)} />)

    expect(screen.getByText('M & A')).toBeInTheDocument()
    expect(screen.getByText(/María/)).toBeInTheDocument()
    expect(screen.getByText('12 · 10 · 2026')).toBeInTheDocument()
    expect(screen.getByText('Jardín Botánico Luna')).toBeInTheDocument()
    expect(screen.getByText('Boda')).toBeInTheDocument()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('mantiene el nombre del modelo como pie', () => {
    render(<TemplateCard dictionary={es} template={plantilla(MUESTRA)} />)
    expect(screen.getByText('Perla')).toBeInTheDocument()
  })

  it('respeta el texto de la muestra: no inventa un «&» donde no lo hay', () => {
    // «Gala / Anual» del modelo corporativo no son dos novios: añadir la conjunción por
    // el hecho de haber dos líneas convertía el nombre de un evento en una pareja.
    render(
      <TemplateCard
        dictionary={es}
        template={plantilla({ ...MUESTRA, monogram: 'IP', names: 'Gala\nAnual' })}
      />,
    )

    // Sobre el texto compuesto: el «&» se pintaba en un nodo aparte y una consulta por
    // texto exacto no lo veía — la prueba pasaba con el fallo dentro.
    const tarjeta = screen.getByRole('figure')
    expect(tarjeta.textContent).toContain('Gala')
    expect(tarjeta.textContent).toContain('Anual')
    expect(tarjeta.textContent).not.toContain('& Anual')
  })

  it('sin muestra cargada cae a la fotografía en vez de dibujar una tarjeta vacía', () => {
    render(<TemplateCard dictionary={es} template={plantilla(null)} />)
    expect(screen.getByRole('img')).toBeInTheDocument()
  })
})
