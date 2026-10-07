import { describe, expect, it } from 'vitest'
import { type CampoValidable, mensajeDeValidacion } from './validacion'

const VALIDO: ValidityState = {
  badInput: false, customError: false, patternMismatch: false, rangeOverflow: false, rangeUnderflow: false,
  stepMismatch: false, tooLong: false, tooShort: false, typeMismatch: false, valid: false, valueMissing: false,
}
const campo = (falla: Partial<ValidityState>, extra: Partial<CampoValidable> = {}): CampoValidable => ({
  validity: { ...VALIDO, ...falla }, type: 'text', minLength: -1, maxLength: -1, min: '', max: '', title: '', validationMessage: 'x', value: '', ...extra,
})

describe('mensajeDeValidacion', () => {
  it('dice qué falta, en español, en vez de «Please fill out this field»', () => {
    expect(mensajeDeValidacion(campo({ valueMissing: true }), 'input', 'es')).toBe('Este campo es obligatorio.')
    expect(mensajeDeValidacion(campo({ valueMissing: true }), 'select', 'es')).toBe('Elige una opción.')
    expect(mensajeDeValidacion(campo({ valueMissing: true }, { type: 'checkbox' }), 'input', 'es')).toBe('Marca esta casilla para continuar.')
  })

  it('explica el formato que espera', () => {
    expect(mensajeDeValidacion(campo({ typeMismatch: true }, { type: 'email' }), 'input', 'es')).toBe('Escribe un correo válido, como nombre@correo.com.')
    expect(mensajeDeValidacion(campo({ tooShort: true }, { minLength: 8, value: 'abc' }), 'input', 'es')).toBe('Escribe al menos 8 caracteres (llevas 3).')
    expect(mensajeDeValidacion(campo({ rangeUnderflow: true }, { min: '1' }), 'input', 'es')).toBe('El mínimo es 1.')
    expect(mensajeDeValidacion(campo({ patternMismatch: true }, { title: 'Seis dígitos.' }), 'input', 'es')).toBe('Seis dígitos.')
  })

  it('en una página en inglés, en inglés', () => {
    expect(mensajeDeValidacion(campo({ valueMissing: true }), 'input', 'en')).toBe('This field is required.')
  })
})
