import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { createCategory } from './category'

const input = { slug: 'boda', name: 'Boda', sortOrder: 1 }

describe('createCategory', () => {
  it('construye una categoría válida', () => {
    const result = createCategory(input)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.name).toBe('Boda')
  })

  it('rechaza un slug vacío', () => {
    const result = createCategory({ ...input, slug: '  ' })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_slug')
  })

  it('rechaza un nombre vacío', () => {
    const result = createCategory({ ...input, name: '' })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_name')
  })
})
