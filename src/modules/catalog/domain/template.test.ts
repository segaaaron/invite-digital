import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { createTemplate } from './template'

const base = {
  id: '22222222-2222-2222-2222-222222222222',
  slug: 'boda-clasica',
  categorySlug: 'bodas',
  categoryName: 'Bodas',
  coverImagePath: '/templates/boda-clasica.jpg',
  palette: { base: '#FFFFFF', accent: '#C9A227' },
  sortOrder: 1,
  name: 'Boda Clásica',
  description: 'Diseño elegante para bodas.',
}

describe('createTemplate', () => {
  it('construye una plantilla válida con los campos recortados', () => {
    const result = createTemplate({ ...base, slug: '  boda-clasica  ' })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.slug).toBe('boda-clasica')
      expect(result.value.name).toBe('Boda Clásica')
    }
  })

  it('rechaza un slug vacío', () => {
    const result = createTemplate({ ...base, slug: '   ' })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_slug')
  })

  it('rechaza una categoría vacía', () => {
    const result = createTemplate({ ...base, categorySlug: '   ' })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_slug')
  })

  it('rechaza un nombre vacío', () => {
    const result = createTemplate({ ...base, name: '   ' })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_name')
  })

  it('rechaza una ruta de imagen que no empieza con /', () => {
    const result = createTemplate({ ...base, coverImagePath: 'templates/boda-clasica.jpg' })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_image_path')
  })

  it('rechaza una ruta de imagen vacía', () => {
    const result = createTemplate({ ...base, coverImagePath: '   ' })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_image_path')
  })

  it('rechaza un color base con forma inválida', () => {
    const result = createTemplate({ ...base, palette: { ...base.palette, base: 'FFFFFF' } })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_palette')
  })

  it('rechaza un color de acento con forma inválida', () => {
    const result = createTemplate({ ...base, palette: { ...base.palette, accent: '#12' } })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_palette')
  })

  it('rechaza un sortOrder negativo', () => {
    const result = createTemplate({ ...base, sortOrder: -1 })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_sort_order')
  })

  it('rechaza un sortOrder no entero', () => {
    const result = createTemplate({ ...base, sortOrder: 1.5 })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_sort_order')
  })

  it('identifica la plantilla por su slug en el detalle del error', () => {
    const result = createTemplate({ ...base, name: '   ' })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.detail).toContain(base.slug)
  })
})
