import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import type { TemplateInput } from '../domain/template'
import { listTemplates } from './list-templates'
import type { TemplateRepository } from './ports'

const row: TemplateInput = {
  id: '11111111-1111-1111-1111-111111111111',
  slug: 'perla',
  categorySlug: 'boda',
  categoryName: 'Boda',
  coverImagePath: '/templates/perla.jpg',
  palette: { base: '#FFFFFF', accent: '#C9A227' },
  sortOrder: 1,
  name: 'Perla',
  description: 'Elegancia clásica.',
}

const repositoryOf = (rows: TemplateInput[]): TemplateRepository => ({
  listPublished: async () => rows,
  findBySlug: async (slug) => rows.find((r) => r.slug === slug) ?? null,
})

describe('listTemplates', () => {
  it('devuelve las plantillas ordenadas por sortOrder', async () => {
    const second: TemplateInput = { ...row, id: '22222222-2222-2222-2222-222222222222', slug: 'zafiro', sortOrder: 2 }
    const result = await listTemplates({ templates: repositoryOf([second, row]) })('es')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.map((t) => t.slug)).toEqual(['perla', 'zafiro'])
  })

  it('falla si una plantilla de la base es inválida', async () => {
    const invalid: TemplateInput = { ...row, coverImagePath: 'templates/perla.jpg' }
    const result = await listTemplates({ templates: repositoryOf([invalid]) })('es')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_image_path')
  })

  it('falla si la paleta de una plantilla no es hexadecimal', async () => {
    const invalid: TemplateInput = { ...row, palette: { base: 'blanco', accent: '#C9A227' } }
    const result = await listTemplates({ templates: repositoryOf([invalid]) })('es')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_palette')
  })

  it('devuelve lista vacía sin plantillas', async () => {
    const result = await listTemplates({ templates: repositoryOf([]) })('es')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual([])
  })
})
