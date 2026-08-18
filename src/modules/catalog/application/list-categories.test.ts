import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import type { CategoryInput } from '../domain/category'
import { listCategories } from './list-categories'
import type { CategoryRepository } from './ports'

const boda: CategoryInput = { slug: 'boda', name: 'Boda', sortOrder: 2 }
const quince: CategoryInput = { slug: 'xv', name: 'XV años', sortOrder: 1 }

const repositoryOf = (rows: CategoryInput[]): CategoryRepository => ({ listAll: async () => rows })

describe('listCategories', () => {
  it('devuelve las categorías ordenadas por sortOrder', async () => {
    const result = await listCategories({ categories: repositoryOf([boda, quince]) })('es')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.map((category) => category.slug)).toEqual(['xv', 'boda'])
  })

  it('propaga el error de dominio de una fila inválida', async () => {
    const result = await listCategories({ categories: repositoryOf([{ ...boda, name: '' }]) })('es')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_name')
  })
})
