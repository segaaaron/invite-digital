import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { aprobarVersion, descontarRonda, enviarADiseno, marcarVersionEnviada, pedirCambios, puedeRepartir, type Diseno } from './diseno'

const nuevo: Diseno = { estado: 'esperando_datos', rondasIncluidas: 2, rondasUsadas: 0, diasDeEntrega: 3, entregaHasta: null }

describe('el diseño por encargo', () => {
  it('el cliente manda sus datos: entra en diseño con fecha de entrega', () => {
    const r = enviarADiseno(nuevo, '2026-10-02')
    expect(isOk(r) && r.value).toMatchObject({ estado: 'en_diseno', entregaHasta: '2026-10-05' })
  })

  it('el equipo envía la versión; el cliente la aprueba', () => {
    const enDiseno = { ...nuevo, estado: 'en_diseno' as const, entregaHasta: '2026-10-05' }
    const enviada = marcarVersionEnviada(enDiseno)
    expect(isOk(enviada) && enviada.value.estado).toBe('version_enviada')
    const aprobada = isOk(enviada) ? aprobarVersion(enviada.value) : enviada
    expect(isOk(aprobada) && aprobada.value.estado).toBe('aprobada')
  })

  it('pedir cambios gasta una ronda y vuelve a diseño, con dos días para la nueva versión', () => {
    const enviada = { ...nuevo, estado: 'version_enviada' as const }
    const r = pedirCambios(enviada, '2026-10-10')
    expect(isOk(r) && r.value).toMatchObject({ estado: 'en_diseno', rondasUsadas: 1, entregaHasta: '2026-10-12' })
  })

  it('sin rondas, pedir cambios se rechaza: cada cambio es un extra', () => {
    const r = pedirCambios({ ...nuevo, estado: 'version_enviada', rondasUsadas: 2 }, '2026-10-10')
    expect(isErr(r) && r.error).toBe('sin_rondas')
  })

  it('no se salta pasos: aprobar sin versión enviada, o pedir cambios en diseño, se rechaza', () => {
    expect(isErr(aprobarVersion(nuevo))).toBe(true)
    expect(isErr(pedirCambios({ ...nuevo, estado: 'en_diseno' }, '2026-10-10'))).toBe(true)
    expect(isErr(marcarVersionEnviada(nuevo))).toBe(true)
    expect(isErr(enviarADiseno({ ...nuevo, estado: 'aprobada' }, '2026-10-10'))).toBe(true)
  })

  it('un error nuestro no cuenta: devuelve la ronda, nunca por debajo de cero', () => {
    expect(descontarRonda({ ...nuevo, rondasUsadas: 1 }).rondasUsadas).toBe(0)
    expect(descontarRonda(nuevo).rondasUsadas).toBe(0)
  })

  it('se reparte con la versión aprobada y el saldo pagado; sin encargo, como siempre', () => {
    expect(puedeRepartir(null, { saldoPendiente: false })).toBe(true)
    expect(puedeRepartir({ ...nuevo, estado: 'aprobada' }, { saldoPendiente: false })).toBe(true)
    expect(puedeRepartir({ ...nuevo, estado: 'aprobada' }, { saldoPendiente: true })).toBe(false)
    expect(puedeRepartir({ ...nuevo, estado: 'version_enviada' }, { saldoPendiente: false })).toBe(false)
  })
})
