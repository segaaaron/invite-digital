import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const CARPETA = join(process.cwd(), 'db/migrations')

type Entrada = { idx: number; tag: string; when: number }

const journal = (): { entries: Entrada[] } =>
  JSON.parse(readFileSync(join(CARPETA, 'meta/_journal.json'), 'utf8')) as { entries: Entrada[] }

const ficheros = (): string[] =>
  readdirSync(CARPETA)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => f.replace(/\.sql$/, ''))
    .sort()

/**
 * El registro de migraciones y la carpeta tienen que decir lo mismo.
 *
 * Esto existe porque no lo decían: el registro se quedó en `0007` y las nueve
 * migraciones siguientes, escritas a mano, **nunca se dieron de alta**. `pnpm db:migrate`
 * ni las miraba. En la base de desarrollo estaban aplicadas porque se corrieron a mano,
 * así que no se notaba; una base nueva —un despliegue limpio— arrancaba sin dos tablas y
 * sin once columnas, y la aplicación reventaba en la primera consulta.
 *
 * Nada en el typecheck, el lint ni las pruebas lo habría dicho. Esta prueba sí.
 */
describe('registro de migraciones', () => {
  it('cada fichero .sql está dado de alta en el registro', () => {
    const registradas = journal().entries.map((e) => e.tag)
    expect([...registradas].sort()).toEqual(ficheros())
  })

  it('el registro no nombra migraciones que no existen', () => {
    const enDisco = new Set(ficheros())
    for (const entrada of journal().entries) expect(enDisco.has(entrada.tag)).toBe(true)
  })

  it('los índices van seguidos y sin repetirse: drizzle los aplica en ese orden', () => {
    const idx = journal().entries.map((e) => e.idx)
    expect(idx).toEqual(idx.map((_, i) => i))
  })

  it('las marcas de tiempo crecen: son lo que decide qué falta por aplicar', () => {
    const when = journal().entries.map((e) => e.when)
    expect(when).toEqual([...when].sort((a, b) => a - b))
    expect(new Set(when).size).toBe(when.length)
  })

  it('toda migración escrita a mano se puede volver a aplicar sin romperse', () => {
    // Las que Drizzle no generó se corren dos veces en la práctica: una base que ya las
    // tenía las verá otra vez al reconciliar el registro. `add constraint` no admite
    // `if not exists`, así que va siempre precedido de su `drop constraint if exists`.
    for (const tag of ficheros()) {
      const sql = readFileSync(join(CARPETA, `${tag}.sql`), 'utf8').toLowerCase()
      for (const nombre of [...sql.matchAll(/add constraint\s+([a-z0-9_]+)/g)].map((m) => m[1])) {
        expect(sql, `${tag}: la restricción ${nombre} se añade sin borrarla antes`).toContain(
          `drop constraint if exists ${nombre}`,
        )
      }
    }
  })
})
