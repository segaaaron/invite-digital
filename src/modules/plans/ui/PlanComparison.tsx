import type { Allowance } from '../domain/allowance'
import { filasComparativas, type TextosComparativa } from '../domain/comparativa'

type Props = {
  planes: ReadonlyArray<{ nombre: string; limites: Allowance }>
  textos: TextosComparativa & { title: string; feature: string; extrasTitle: string }
  /** Los extras a la venta, ya con su precio en palabras. Sin ninguno, no hay bloque. */
  extras?: ReadonlyArray<{ name: string; precio: string }>
}

/**
 * La tabla que compara los planes en la web. **Sus filas salen de los límites de la base**,
 * los mismos que corta el servidor: un texto escrito a mano acaba prometiendo lo que el
 * plan no trae, y eso ya pasó con «3D real» y «dominio propio».
 */
export function PlanComparison({ planes, textos, extras = [] }: Props) {
  const filas = filasComparativas(
    planes.map((p) => p.limites),
    textos,
  )

  return (
    <div className="mt-16">
      <h3 className="text-center font-display text-[28px] font-light text-ink">{textos.title}</h3>
      <div className="relative mt-8 overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-left text-[14px]">
          <thead>
            <tr className="border-b border-line">
              <th className="sticky left-0 bg-bg py-3 pr-4 pl-5 font-mono text-[10px] font-normal tracking-[var(--tracking-luxe)] text-ink-mute uppercase" scope="col">
                {textos.feature}
              </th>
              {planes.map((p) => (
                <th className="px-3 py-3 text-center font-display text-[20px] font-light text-ink" key={p.limites.planSlug} scope="col">
                  {p.nombre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr className="border-b border-line last:border-none" key={fila.clave}>
                <th className="sticky left-0 max-w-[42vw] bg-bg py-3 pr-4 pl-5 font-normal text-ink-soft" scope="row">
                  {fila.etiqueta}
                </th>
                {fila.valores.map((celda, i) => (
                  <td
                    className={`px-3 py-3 text-center [font-variant-numeric:lining-nums] ${celda.incluido ? 'text-ink' : 'text-ink-mute'}`}
                    key={planes[i]?.limites.planSlug ?? i}
                  >
                    {celda.texto}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {extras.length === 0 ? null : (
        <div className="mt-10 flex flex-col items-center gap-4">
          <h3 className="font-display text-[22px] font-light text-ink">{textos.extrasTitle}</h3>
          <ul className="flex flex-wrap justify-center gap-2.5">
            {extras.map((x) => (
              <li className="rounded-[var(--radius-pill)] border border-line px-4 py-2 text-[13px] text-ink-soft" key={x.name}>
                {x.name} · <span className="text-ink [font-variant-numeric:lining-nums]">{x.precio}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
