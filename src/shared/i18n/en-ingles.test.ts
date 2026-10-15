import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { enIngles, traducir } from './en-ingles'
import { traductor } from './t'

/** Todos los `.ts`/`.tsx` de `src` que no son pruebas. */
function fuentes(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) return fuentes(ruta)
    return /\.tsx?$/.test(nombre) && !/\.test\./.test(nombre) ? [ruta] : []
  })
}

/** Los mensajes de los errores del dominio: `xError('clase', 'mensaje')` o con plantilla. */
function mensajesDelCodigo(): string[] {
  const raiz = join(__dirname, '..', '..')
  const vistos = new Set<string>()
  for (const ruta of fuentes(raiz)) {
    const texto = readFileSync(ruta, 'utf8')
    const patrones = [/[a-zA-Z]+Error\('[a-z_]+', *('([^'\\]|\\.)*'|`[^`]*`)/g, /\bmensaje: ('([^'\\]|\\.)*'|`[^`]*`)/g, /\bfallo\(('([^'\\]|\\.)*'|`[^`]*`)/g]
    // `mensaje:` y `fallo(…)` solo en el dominio y los casos de uso: en las pantallas y diccionarios es otra cosa.
    const aplica = /modules\/[^/]+\/(domain|application)\//.test(ruta) ? patrones : patrones.slice(0, 1)
    for (const m of aplica.flatMap((patron) => [...texto.matchAll(patron)])) {
      const crudo = m[1]!.slice(1, -1)
      // Un campo (`'email'`, `'eventDate'`) no es una frase: es la clave que se marca en el formulario.
      if (/^[a-zA-Z.${}]+$/.test(crudo) || !/ /.test(crudo)) continue
      vistos.add(crudo.replace(/\$\{[^}]*\}/g, 'X1'))
    }
  }
  return [...vistos]
}

describe('los mensajes del dominio, en inglés', () => {
  it('cada mensaje de error del código tiene su traducción', () => {
    const sin = mensajesDelCodigo().filter((m) => enIngles(m) === undefined)
    expect(sin).toEqual([])
  })

  it('traduce los que llevan datos y deja la causa técnica como está', () => {
    expect(enIngles('No se pudo crear la mesa: Error: boom')).toBe('Could not create the table: Error: boom')
    expect(enIngles('No existe el regalo abc.')).toBe('There is no gift abc.')
    expect(enIngles('Ya hay una «Mesa 1» en este evento.')).toBe('There is already a “Mesa 1” in this event.')
  })

  it('en español no cambia nada, y lo desconocido sale tal cual', () => {
    expect(traducir('El invitado necesita un nombre.', traductor('es'))).toBe('El invitado necesita un nombre.')
    expect(traducir('El invitado necesita un nombre.', traductor('en'))).toBe('The guest needs a name.')
    expect(traducir('algo que nadie escribió', traductor('en'))).toBe('algo que nadie escribió')
  })
})

describe('lo que el plan no trae', () => {
  it('dice el plan y la función, y qué plan la trae', () => {
    expect(enIngles('El plan atelier no incluye el modo puerta; lo trae el plan gala.')).toBe('The atelier plan doesn’t include door mode; the gala plan does.')
    expect(enIngles('El plan gala no incluye el libro de firmas.')).toBe('The gala plan doesn’t include the guestbook.')
  })
})
