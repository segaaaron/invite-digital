import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/composition/container', () => ({ admin: {}, identity: {}, events: {} }))
vi.mock('@/shared/observability/fallos', () => ({ registrarFallo: vi.fn() }))

describe('llaveDelEncabezado', () => {
  it('la llave de Siri solo vale en su ruta', async () => {
    const { llaveDelEncabezado, RUTA_DE_SIRI } = await import('./sesion')
    expect(llaveDelEncabezado(RUTA_DE_SIRI, 'Bearer abcdefghijklmnopqrstuv')).toBe('abcdefghijklmnopqrstuv')
    expect(llaveDelEncabezado('/panel/cuenta', 'Bearer abcdefghijklmnopqrstuv')).toBeNull()
    expect(llaveDelEncabezado(`${RUTA_DE_SIRI}/otra`, 'Bearer abcdefghijklmnopqrstuv')).toBeNull()
    expect(llaveDelEncabezado(RUTA_DE_SIRI, 'Basic abcdefghijklmnopqrstuv')).toBeNull()
    expect(llaveDelEncabezado(RUTA_DE_SIRI, null)).toBeNull()
  })
})
