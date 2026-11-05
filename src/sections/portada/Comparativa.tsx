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
  /** Los textos de las filas, ya elegidas y ordenadas por quien pinta la tabla. */
  readonly textos: TextosComparativa & {
    readonly feature: string
    readonly grupos: Record<GrupoDeComparativa, string>
    readonly todosIncluyen: string
    readonly extra: string
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
  const filas = filasComparativas(
    columnas.map((c) => c.limites),
    textos,
  )
  // «Envíos ilimitados» solo entra en el recuadro mientras **ningún plan tenga tope**. Con un tope
  // cargado en el admin, la línea sale de aquí y el tope se compara en la tabla, fila a fila.
  const conTope = columnas.some((c) => c.limites.maxGuestGroups !== null)
  const incluyen = conTope
    ? p.comparativa.incluyenItems
    : [...p.comparativa.incluyenItems.slice(0, 4), p.comparativa.enviosIlimitados, ...p.comparativa.incluyenItems.slice(4)]
  const celda = (texto: string, incluido: boolean, clave: string): ReactNode => {
    // Luxury Planner no es un «no»: el plan que no lo trae lo puede sumar desde su panel.
    if (!incluido && clave === 'luxury') return <span className="plus">{textos.extra}</span>
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
        {/* Lo que traen **todos** los planes: una lista con checks, no un párrafo con puntos
            (documento del 30 oct). Se escribe en el diccionario y no se deduce de la tabla,
            porque hay filas que van en los dos sitios. */}
        <div className="allinc">
          <div className="k">{p.comparativa.incluyen}</div>
          <ul className="allinc-lista">
            {incluyen.map((linea) => (
              <li key={linea}>{linea}</li>
            ))}
          </ul>
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
                          {celda(valor.texto, valor.incluido, fila.clave)}
                        </td>
                      ))}
                    </tr>
                  )),
                ]
              })}
            </tbody>
          </table>
        </div>
        {/* Un botón por plan al final de la tabla: quien compara aquí ya está eligiendo. */}
        <div className="tabla-cta">
          {columnas.map((c) => (
            <a className={c.destacado ? 'cta-pill' : 'btn-linea'} href="#cierre" key={c.nombre}>
              {p.planes.elegir.replace('{plan}', c.nombre)}
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
