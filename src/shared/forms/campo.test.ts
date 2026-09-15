import { describe, expect, it } from 'vitest'
import { campo } from './campo'

describe('campo', () => {
  it('lee el texto del campo, y vacío si no viene', () => {
    const fd = new FormData()
    fd.set('nombre', 'Ana')
    expect(campo(fd, 'nombre')).toBe('Ana')
    expect(campo(fd, 'falta')).toBe('')
  })
})
