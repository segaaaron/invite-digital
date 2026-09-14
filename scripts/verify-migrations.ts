/**
 * Comprueba que el registro de migraciones y la carpeta dicen lo mismo, **antes** de
 * migrar.
 *
 * Existe porque `drizzle-kit migrate` solo aplica lo que está dado de alta en
 * `meta/_journal.json`: una migración escrita a mano y no registrada **se ignora en
 * silencio**, el despliegue sale verde y la base se queda sin la columna. Ya pasó en este
 * proyecto —el registro se quedó en `0007` mientras se escribían nueve migraciones— y no
 * se notó hasta que una base nueva arrancó sin dos tablas.
 *
 * `src/shared/db/migrations-journal.test.ts` vigila lo mismo, pero solo protege a quien
 * corre `pnpm check` antes de empujar. Esto corre **dentro del despliegue**, delante de
 * `db:migrate`: como `web` espera a que el migrador termine bien, una migración huérfana
 * detiene el despliegue y la versión anterior sigue sirviendo, en vez de dejar la base a
 * medio migrar sirviendo código que espera columnas que no existen.
 *
 * Autónomo a propósito, como `verify-tenancy.ts` y `preflight.ts`: no puede depender de
 * vitest, que no está en la imagen de producción.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

type Entrada = { idx: number; tag: string; when: number }

const CARPETA = join(process.cwd(), 'db/migrations')

function main(): number {
  const problemas: string[] = []

  let entradas: Entrada[]
  try {
    const crudo = JSON.parse(readFileSync(join(CARPETA, 'meta/_journal.json'), 'utf8')) as { entries: Entrada[] }
    entradas = crudo.entries
  } catch (causa) {
    console.error(`No se pudo leer el registro de migraciones: ${String(causa)}`)
    return 1
  }

  const enDisco = readdirSync(CARPETA)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => f.replace(/\.sql$/, ''))
    .sort()

  const registradas = entradas.map((e) => e.tag)

  // Lo que de verdad importa: un fichero sin registrar no se aplica nunca.
  for (const tag of enDisco) {
    if (!registradas.includes(tag)) {
      problemas.push(`${tag}.sql existe pero NO está en meta/_journal.json: drizzle no la aplicaría jamás.`)
    }
  }

  for (const tag of registradas) {
    if (!enDisco.includes(tag)) {
      problemas.push(`El registro nombra «${tag}», que no existe en db/migrations.`)
    }
  }

  // Drizzle aplica por índice: un hueco o un repetido cambia el orden de lo que falta.
  const indices = entradas.map((e) => e.idx)
  const esperados = indices.map((_, i) => i)
  if (JSON.stringify(indices) !== JSON.stringify(esperados)) {
    problemas.push(`Los índices del registro no van seguidos desde 0: ${indices.join(', ')}`)
  }

  // Y decide qué falta por aplicar comparando marcas de tiempo: si no crecen, una
  // migración nueva puede quedar «por detrás» de otra ya aplicada y saltarse.
  const marcas = entradas.map((e) => e.when)
  const ordenadas = [...marcas].sort((a, b) => a - b)
  if (JSON.stringify(marcas) !== JSON.stringify(ordenadas)) {
    problemas.push('Las marcas de tiempo del registro no van en orden creciente.')
  }
  if (new Set(marcas).size !== marcas.length) {
    problemas.push('Hay marcas de tiempo repetidas en el registro.')
  }

  if (problemas.length > 0) {
    console.error('Registro de migraciones inconsistente — el despliegue se detiene:')
    for (const problema of problemas) console.error(`  · ${problema}`)
    return 1
  }

  console.log(`Registro de migraciones: ${enDisco.length} migraciones, todas dadas de alta y en orden.`)
  return 0
}

process.exit(main())
