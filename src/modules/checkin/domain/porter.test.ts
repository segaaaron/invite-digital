import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { HORAS_ANTES_POR_DEFECTO, HORAS_DESPUES_POR_DEFECTO, cabeUnoMas, generarPin, leerPortero, ventanaAbierta } from './porter'

describe('leerPortero', () => {
  it('recorta y deja vacío como nulo', () => {
    const r = leerPortero({ name: '  Carlos  ', phone: '', gate: ' Puerta 1 ' })
    expect(isOk(r) && r.value).toEqual({ name: 'Carlos', phone: null, gate: 'Puerta 1' })
  })

  it('exige nombre', () => {
    const r = leerPortero({ name: '   ', phone: '', gate: '' })
    expect(isErr(r) && r.error.campo).toBe('name')
  })

  it('el WhatsApp, si viene, se normaliza y rechaza lo que no es un número', () => {
    const r = leerPortero({ name: 'Ana', phone: '700 12 345', gate: '' })
    expect(isOk(r) && r.value.phone).toBe('+59170012345')
    const malo = leerPortero({ name: 'Ana', phone: '12', gate: '' })
    expect(isErr(malo) && malo.error.campo).toBe('phone')
  })

  it('la puerta va hasta 40 caracteres', () => {
    const r = leerPortero({ name: 'Ana', phone: '', gate: 'x'.repeat(41) })
    expect(isErr(r) && r.error.campo).toBe('gate')
  })
})

describe('generarPin', () => {
  it('son 6 dígitos con ceros a la izquierda', () => {
    expect(generarPin(new Uint8Array([0, 0, 0, 7]))).toBe('000007')
    expect(generarPin(new Uint8Array([255, 255, 255, 255]))).toMatch(/^\d{6}$/)
  })
})

describe('cabeUnoMas', () => {
  it('con el límite justo ya no cabe; cero no admite ninguno; nulo no limita', () => {
    expect(cabeUnoMas(3, 2)).toBe(true)
    expect(cabeUnoMas(3, 3)).toBe(false)
    expect(cabeUnoMas(0, 0)).toBe(false)
    expect(cabeUnoMas(null, 500)).toBe(true)
  })
})

describe('ventanaAbierta', () => {
  // El 17 de octubre en Bolivia (UTC−4) va de 17T04:00Z a 18T04:00Z.
  const base = { eventDate: '2026-10-17', horasAntes: 6, horasDespues: 4 }

  it('abre 6 horas antes del inicio del día en Bolivia', () => {
    expect(ventanaAbierta({ ...base, ahora: new Date('2026-10-16T21:59:00Z') })).toBe(false)
    expect(ventanaAbierta({ ...base, ahora: new Date('2026-10-16T22:00:00Z') })).toBe(true)
  })

  it('cierra 4 horas después del fin del día en Bolivia', () => {
    expect(ventanaAbierta({ ...base, ahora: new Date('2026-10-18T08:00:00Z') })).toBe(true)
    expect(ventanaAbierta({ ...base, ahora: new Date('2026-10-18T08:01:00Z') })).toBe(false)
  })

  // Los valores por defecto son los que de verdad se usan: ninguna pantalla los edita todavía,
  // así que lo que no cubran deja al portero fuera en mitad de la fiesta, sin salida.
  const porDefecto = { eventDate: '2026-10-17', horasAntes: HORAS_ANTES_POR_DEFECTO, horasDespues: HORAS_DESPUES_POR_DEFECTO }

  it('por defecto sigue abierta a las 5 de la mañana siguiente: aquí las fiestas no acaban a medianoche', () => {
    // 2026-10-18T09:00Z son las 05:00 del día siguiente en Bolivia.
    expect(ventanaAbierta({ ...porDefecto, ahora: new Date('2026-10-18T09:00:00Z') })).toBe(true)
  })

  it('por defecto ya está abierta la tarde anterior: el montaje y la prueba del PIN no se hacen a las seis de la mañana', () => {
    // 2026-10-16T20:00Z son las 16:00 del día anterior en Bolivia.
    expect(ventanaAbierta({ ...porDefecto, ahora: new Date('2026-10-16T20:00:00Z') })).toBe(true)
  })

  it('pero no queda abierta para siempre: dos días después, cerrada', () => {
    expect(ventanaAbierta({ ...porDefecto, ahora: new Date('2026-10-19T12:00:00Z') })).toBe(false)
  })
})
