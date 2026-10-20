import { describe, expect, it } from 'vitest'
import { celdaCsv } from './celda'

describe('celdaCsv', () => {
  it('el texto normal pasa tal cual, y lo vacío es vacío', () => {
    expect(celdaCsv('Ana Rojas')).toBe('Ana Rojas')
    expect(celdaCsv(null)).toBe('')
    expect(celdaCsv(undefined)).toBe('')
    expect(celdaCsv(1200)).toBe('1200')
  })

  it('una fórmula se marca como texto, también con espacios delante', () => {
    expect(celdaCsv('=1+1')).toBe("'=1+1")
    expect(celdaCsv('@SUM(A1)')).toBe("'@SUM(A1)")
    // Marcada como texto **y** entrecomillada, porque además lleva comillas dentro.
    expect(celdaCsv('  =WEBSERVICE("http://x")')).toBe('"\'  =WEBSERVICE(""http://x"")"')
  })

  // El agujero de F16: con `;` (el separador de un Excel en español) o un `\r` suelto se abría una
  // celda nueva que empezaba por `=` y la hoja la evaluaba.
  it('el punto y coma y el retorno de carro se quedan dentro de la celda', () => {
    expect(celdaCsv('Juan;=1+1;')).toBe('"Juan;=1+1;"')
    expect(celdaCsv('Juan\r=1+1')).toBe('"Juan\r=1+1"')
    expect(celdaCsv('Juan\t=1+1')).toBe('"Juan\t=1+1"')
  })

  it('la coma, el salto y las comillas siguen entrecomillados y escapados', () => {
    expect(celdaCsv('Rojas, Ana')).toBe('"Rojas, Ana"')
    expect(celdaCsv('dos\nlíneas')).toBe('"dos\nlíneas"')
    expect(celdaCsv('dice "hola"')).toBe('"dice ""hola"""')
  })
})
