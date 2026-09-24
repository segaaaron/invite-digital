import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FRASE_DE_AUDITORIA, GRUPOS_DE_AUDITORIA, prefijosDeGrupo } from './auditoria'

const ficheros = (dir: string): string[] =>
  readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) return ficheros(ruta)
    return /\.tsx?$/.test(nombre) && !/\.test\.tsx?$/.test(nombre) ? [ruta] : []
  })

describe('la auditoría', () => {
  it('tiene frase para cada acción que el código anota', () => {
    const anotadas = new Set<string>()
    for (const fichero of ficheros(join(process.cwd(), 'src'))) {
      const texto = readFileSync(fichero, 'utf8')
      // `action: 'x.y'` y las dos ramas de `action: cond ? 'x.y' : 'x.z'`.
      for (const linea of texto.matchAll(/action: ([^\n]+)/g)) {
        for (const clave of (linea[1] ?? '').matchAll(/'([a-z]+(?:\.[a-z]+)+)'/g)) anotadas.add(clave[1] ?? '')
      }
    }
    expect(anotadas.size).toBeGreaterThan(15)
    expect([...anotadas].filter((accion) => !(accion in FRASE_DE_AUDITORIA))).toEqual([])
  })

  it('cada acción es de un solo tipo del filtro', () => {
    for (const accion of Object.keys(FRASE_DE_AUDITORIA)) {
      const grupos = GRUPOS_DE_AUDITORIA.filter((g) => g.prefijos.some((p) => accion.startsWith(p)))
      expect(grupos.map((g) => g.clave), accion).toHaveLength(1)
    }
  })

  it('un tipo desconocido no filtra', () => {
    expect(prefijosDeGrupo('otra-cosa')).toBeNull()
    expect(prefijosDeGrupo(undefined)).toBeNull()
    expect(prefijosDeGrupo('soporte')).toEqual(['soporte.'])
  })
})
