import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import type { TemplateInput } from '../domain/template'
import { getTemplate } from './get-template'
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

describe('getTemplate', () => {
  it('devuelve la plantilla cuando existe y es válida', async () => {
    const result = await getTemplate({ templates: repositoryOf([row]) })('perla', 'es')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.slug).toBe('perla')
  })

  it('devuelve not_found cuando la plantilla no existe', async () => {
    const result = await getTemplate({ templates: repositoryOf([row]) })('inexistente', 'es')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('not_found')
  })

  it('propaga el error del dominio si la plantilla encontrada tiene datos corruptos', async () => {
    const invalid: TemplateInput = { ...row, palette: { base: 'blanco', accent: '#C9A227' } }
    const result = await getTemplate({ templates: repositoryOf([invalid]) })('perla', 'es')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_palette')
  })

  it('propaga invalid_image_path si la plantilla encontrada tiene una ruta de imagen inválida', async () => {
    const invalid: TemplateInput = { ...row, coverImagePath: 'templates/perla.jpg' }
    const result = await getTemplate({ templates: repositoryOf([invalid]) })('perla', 'es')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_image_path')
  })
})
