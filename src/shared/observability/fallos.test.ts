import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { eq } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { serviceFailures } from '@/shared/db/schema'
import { esCorteDelCliente, esFalloDelServicio, guardarFallo, huellaDe } from './fallos'
import { borrarTipoDeFallo, tiposDeFallo } from './lectura'

const SERVICIO = `prueba/${crypto.randomUUID().slice(0, 8)}`

afterAll(async () => {
  await db.delete(serviceFailures).where(eq(serviceFailures.service, SERVICIO))
})

describe('registro de fallos', () => {
  it('agrupa el mismo fallo aunque cambien los números, los identificadores y los correos', () => {
    expect(huellaDe('events/actions', 'No se pudo guardar el bloque map del evento 3f2a1b4c-1111-2222-3333-444455556666: tiempo 5000 ms')).toBe(
      huellaDe('events/actions', 'No se pudo guardar el bloque map del evento 9e8d7c6b-aaaa-bbbb-cccc-ddddeeeeffff: tiempo 30 ms'),
    )
    expect(huellaDe('a', 'mandar a ana@x.bo')).toBe(huellaDe('a', 'mandar a luis@y.com'))
    expect(huellaDe('a', 'uno')).not.toBe(huellaDe('b', 'uno'))
  })

  it('solo lo que se rompió: un rechazo de validación o un corte del navegador no llenan el registro', () => {
    expect(esFalloDelServicio(['alta de evento rechazada', 'deadline_after_event', 'La fecha límite no puede ser posterior al evento'])).toBe(false)
    expect(esFalloDelServicio(['inicio de sesión rechazado', 'invalid_credentials', 'Intento fallido para a@b.bo'])).toBe(false)
    expect(esFalloDelServicio(['alta de invitado rechazada', 'storage_failure', 'La base no responde'])).toBe(true)
    expect(esFalloDelServicio(['no se pudo avisar', new Error('x')])).toBe(true)
    expect(esCorteDelCliente(new Error('The destination stream closed early.'))).toBe(true)
    expect(esCorteDelCliente(new Error('relation does not exist'))).toBe(false)
    // La red del invitado, no el servicio: cada navegador lo dice a su manera.
    expect(esCorteDelCliente(new TypeError('Load failed'))).toBe(true)
    expect(esCorteDelCliente(new Error('Load failed'))).toBe(true)
    expect(esCorteDelCliente(new TypeError('Failed to fetch'))).toBe(true)
    expect(esCorteDelCliente(new TypeError('NetworkError when attempting to fetch resource.'))).toBe(true)
    expect(esCorteDelCliente(new Error('Load failed for the module foo'))).toBe(false)
  })

  it('guarda qué pasó (con los %s rellenados) y por qué (la pila y la causa), y el admin lo lee agrupado', async () => {
    const causa = new Error('conexión rechazada')
    const error = new Error('insert falló', { cause: causa })
    await guardarFallo({ servicio: SERVICIO, partes: ['No se pudo guardar el bloque %s:', 'reception', error], ruta: '/panel/eventos/x/configuracion', accion: 'abc' })
    await guardarFallo({ servicio: SERVICIO, partes: ['No se pudo guardar el bloque %s:', 'reception', error], ruta: null, accion: null })

    const tipo = (await tiposDeFallo(1, 'servidor')).find((t) => t.servicio === SERVICIO)
    expect(tipo).toMatchObject({ veces: 2, mensaje: 'No se pudo guardar el bloque reception: insert falló', origen: 'servidor' })
    expect(tipo!.detalle).toContain('insert falló')
    expect(tipo!.detalle).toContain('causado por: Error: conexión rechazada')

    expect(await borrarTipoDeFallo(tipo!.huella)).toBe(2)
    expect((await tiposDeFallo(1, null)).some((t) => t.servicio === SERVICIO)).toBe(false)
  })
})

/**
 * **La guarda del registro** (20 de octubre).
 *
 * `esFalloDelServicio` decide por el **texto**, así que una llamada perfectamente escrita pero mal
 * redactada —«el código de recuperación no salió»— se queda en la consola del contenedor y no llega
 * nunca al panel. Pasó con los tres avisos del correo, con la push a un destino desconocido, con la
 * sesión de puerta que no verifica y con las traducciones faltantes del catálogo: la línea existía,
 * el comentario de al lado prometía que se vería, y no se guardaba nada.
 *
 * Esto recorre las llamadas cuyos argumentos son **todos literales** —las únicas que se pueden
 * juzgar sin ejecutar nada— y exige que el filtro las deje pasar. Las que llevan una variable
 * (`causa`, `e`) no se juzgan aquí: casi siempre traen el `Error`, que entra por su propia regla.
 */
describe('ningún registrarFallo escrito para no guardarse', () => {
  const RAIZ = join(process.cwd(), 'src')

  const ficheros = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
      const ruta = join(dir, entrada.name)
      if (entrada.isDirectory()) return ficheros(ruta)
      if (!/\.tsx?$/.test(entrada.name) || /\.test\.tsx?$/.test(entrada.name)) return []
      return [ruta]
    })

  /** Los argumentos de la llamada que empieza en `desde`, partidos por las comas de su nivel. */
  const argumentosDe = (fuente: string, desde: number): string[] => {
    const partes: string[] = []
    let actual = ''
    let profundidad = 0
    let comilla: string | null = null

    for (let i = desde; i < fuente.length; i++) {
      const c = fuente[i] as string
      if (comilla !== null) {
        actual += c
        if (c === '\\') {
          actual += fuente[i + 1] ?? ''
          i++
        } else if (c === comilla) comilla = null
        continue
      }
      if (c === "'" || c === '"' || c === '`') {
        comilla = c
        actual += c
        continue
      }
      if (c === '(' || c === '[' || c === '{') profundidad++
      if (c === ')' || c === ']' || c === '}') {
        profundidad--
        if (profundidad === 0) {
          partes.push(actual)
          return partes.map((p) => p.trim()).filter((p) => p !== '')
        }
      }
      if (c === ',' && profundidad === 1) {
        partes.push(actual)
        actual = ''
        continue
      }
      if (profundidad >= 1) actual += c
    }
    return []
  }

  /** El texto de un argumento literal, o `null` si lleva algo que solo se sabe ejecutando. */
  const textoLiteral = (argumento: string): string | null => {
    if (/^'(?:[^'\\]|\\.)*'$/.test(argumento) || /^"(?:[^"\\]|\\.)*"$/.test(argumento)) return argumento.slice(1, -1)
    // Una plantilla cuenta por su parte fija: `${...}` puede ser cualquier cosa.
    if (argumento.startsWith('`') && argumento.endsWith('`')) return argumento.slice(1, -1).replace(/\$\{[^}]*\}/g, ' ')
    return null
  }

  it('toda llamada de argumentos literales pasa el filtro y acaba en el panel', () => {
    const mudas: string[] = []
    const ilegibles: string[] = []
    let revisadas = 0

    for (const ruta of ficheros(RAIZ)) {
      if (ruta.endsWith(join('shared', 'observability', 'fallos.ts'))) continue
      const fuente = readFileSync(ruta, 'utf8')

      for (const coincidencia of fuente.matchAll(/registrarFallo\(/g)) {
        const abre = coincidencia.index + 'registrarFallo'.length
        const linea = fuente.slice(0, coincidencia.index).split('\n').length
        const [, ...resto] = argumentosDe(fuente, abre)
        // Una llamada que no se sabe leer es una llamada sin vigilar: eso no se deja pasar.
        if (resto.length === 0) {
          ilegibles.push(`${relative(process.cwd(), ruta)}:${linea}`)
          continue
        }
        const textos: string[] = []
        for (const argumento of resto) {
          const texto = textoLiteral(argumento)
          if (texto === null) break
          textos.push(texto)
        }
        // Con una variable por medio no se puede juzgar desde aquí.
        if (textos.length !== resto.length) continue
        revisadas += 1
        if (esFalloDelServicio(textos)) continue
        mudas.push(`${relative(process.cwd(), ruta)}:${linea} → ${textos.join(' | ')}`)
      }
    }

    expect(mudas, 'estas llamadas no llegan al registro: redáctalas con «no se pudo…» o pasa un kind `*_failure`').toEqual([])
    // Y que el lector siga leyendo: si deja de reconocer llamadas, lo de arriba pasa en vacío.
    expect(ilegibles, 'no se pudieron leer los argumentos de estas llamadas').toEqual([])
    expect(revisadas).toBeGreaterThan(5)
  })
})
