import type { ReactNode } from 'react'
import type { Allowance } from '@/modules/plans'
import { filasComparativas, type GrupoDeComparativa, type TextosComparativa } from '@/modules/plans'
import type { Dictionary } from '@/shared/i18n/dictionary'

/** El orden de los grupos: primero lo que el invitado ve, al final cuándo llega. */
const ORDEN: readonly GrupoDeComparativa[] = ['invitacion', 'regalos', 'control', 'entrega']

export type ColumnaDeComparativa = {
  readonly nombre: string
  readonly limites: Allowance
  readonly destacado: boolean
  /** El precio de hoy, bajo el nombre. Ya viene escrito por quien conoce la moneda. */
  readonly precio: string
  /** El de lista, tachado al lado. Vacío: el plan no está de lanzamiento. */
  readonly precioAntes: string
}

type Props = {
  readonly dictionary: Dictionary
  readonly columnas: readonly ColumnaDeComparativa[]
  /** Los textos de las filas, ya filtrados por quien sabe si Luxury se vende. */
  readonly textos: TextosComparativa & {
    readonly feature: string
    readonly grupos: Record<GrupoDeComparativa, string>
    readonly todosIncluyen: string
  }
}

/**
 * **Las letras pequeñas**: la tabla que compara los tres planes, con la piel de la portada.
 *
 * Las filas no están escritas a mano: salen de `filasComparativas`, que lee los límites de
 * cada plan en la base —los mismos que corta el servidor—. Una tabla escrita a mano acaba
 * prometiendo lo que el plan no trae, y eso ya pasó una vez.
 *
 * Entra fila por fila: de eso se encarga `PortadaVida`, que busca `#tbody`.
 */
export function Comparativa({ dictionary, columnas, textos }: Props) {
  const p = dictionary.portada
  const todas = filasComparativas(
    columnas.map((c) => c.limites),
    textos,
  )
  // Lo que traen **todos igual** sube al recuadro de arriba: en la tabla sería una fila de ✓
  // repetidos, y lo que se viene a ver aquí es la diferencia.
  // `[].every(...)` es `true`: sin columnas, **todas** las filas subirían al recuadro y la tabla
  // prometería lo que ningún plan trae. Por eso la fila necesita valores para contar como común.
  const iguales = (fila: (typeof todas)[number]) => fila.valores.length > 0 && fila.valores.every((c) => c.incluido && c.texto === fila.valores[0]?.texto)
  const deTodos = todas.filter(iguales)
  const filas = todas.filter((fila) => !iguales(fila))
  const celda = (texto: string, incluido: boolean): ReactNode => {
    if (texto === '✓' || (incluido && texto === '')) return <span className="y">✓</span>
    if (texto === '—' || texto === '') return <span className="n">—</span>
    if (texto.startsWith('+')) return <span className="plus">{texto}</span>
    return texto
  }

  // Sin planes que comparar no se pinta la sección: mejor sin tabla que con una vacía.
  if (columnas.length === 0) return null

  return (
    <section id="comparativa">
      <div className="wrap">
        <div className="sechead">
          <div className="eyebrow">{p.comparativa.titulo}</div>
        </div>
        <div className="allinc">
          <div className="k">{textos.todosIncluyen}</div>
          <p>{deTodos.map((f) => f.etiqueta).join(' · ')}</p>
        </div>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>{textos.feature}</th>
                {columnas.map((c) => (
                  <th key={c.nombre} className={c.destacado ? 'hi' : undefined}>
                    {c.nombre}
                    <span className="pb">
                      {c.precioAntes === '' ? null : <s>{c.precioAntes}</s>}
                      <b>{c.precio}</b>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody id="tbody">
              {ORDEN.flatMap((grupo) => {
                const delGrupo = filas.filter((f) => f.grupo === grupo)
                if (delGrupo.length === 0) return []
                return [
                  <tr key={`g-${grupo}`} className="grp">
                    <td colSpan={columnas.length + 1}>{textos.grupos[grupo]}</td>
                  </tr>,
                  ...delGrupo.map((fila) => (
                    <tr key={fila.clave}>
                      <td>{fila.etiqueta}</td>
                      {fila.valores.map((valor, i) => (
                        <td key={columnas[i]?.nombre ?? i} className={columnas[i]?.destacado === true ? 'hi' : undefined}>
                          {celda(valor.texto, valor.incluido)}
                        </td>
                      ))}
                    </tr>
                  )),
                ]
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
