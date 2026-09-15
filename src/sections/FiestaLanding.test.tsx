import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getDictionary } from '@/shared/i18n/dictionaries'
import type { Template } from '@/modules/catalog'
import { FiestaLanding, plantillasDeFiesta } from './FiestaLanding'

vi.mock('@/modules/catalog/ui/TemplateCard', () => ({
  TemplateCard: ({ template }: { template: Template }) => <article>{template.name}</article>,
}))

const plantilla = (slug: string, categorySlug: string, name: string): Template => ({
  id: slug,
  slug,
  categorySlug,
  categoryName: categorySlug,
  coverImagePath: `/templates/${slug}.avif`,
  palette: {} as Template['palette'],
  sortOrder: 1,
  name,
  description: '',
  sample: null,
})

const catalogo = [plantilla('boda', 'boda', 'Étoile'), plantilla('civil', 'boda-civil', 'Civil'), plantilla('xv-valeria', 'xv-anos', 'Valeria')]

describe('FiestaLanding', () => {
  it('cada fiesta enseña solo sus modelos: la boda civil es boda, los XV van aparte', () => {
    expect(plantillasDeFiesta(catalogo, 'boda').map((t) => t.name)).toEqual(['Étoile', 'Civil'])
    expect(plantillasDeFiesta(catalogo, 'xv').map((t) => t.name)).toEqual(['Valeria'])
  })

  it('la página de XV habla de XV y no pinta ninguna boda', () => {
    const dictionary = getDictionary('es')
    render(<FiestaLanding dictionary={dictionary} fiesta="xv" locale="es" pricing={null} templates={catalogo} />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(dictionary.fiestas.xv.title)
    expect(screen.getByText('Valeria')).toBeInTheDocument()
    expect(screen.queryByText('Étoile')).not.toBeInTheDocument()
    expect(screen.queryByText('Civil')).not.toBeInTheDocument()
  })

  it('enseña lo que el panel ya hace y lleva a los precios', () => {
    const dictionary = getDictionary('es')
    render(<FiestaLanding dictionary={dictionary} fiesta="boda" locale="es" pricing={null} templates={catalogo} />)

    for (const herramienta of dictionary.fiestas.tools) expect(screen.getByText(herramienta.title)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: dictionary.fiestas.boda.cta })).toHaveAttribute('href', '#precios')
  })
})
