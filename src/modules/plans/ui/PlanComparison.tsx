import type { ReactNode } from 'react'
import type { Allowance } from '../domain/allowance'
import { CheckIcon } from '@/shared/design/ui/icons'
import { conPreciosDeExtras, filasComparativas, type GrupoDeComparativa, type NotaDeFila, type PrecioDeFila, type TextosComparativa } from '../domain/comparativa'

/** El orden en que se leen los grupos: primero lo que el invitado ve, al final cuándo llega. */
const ORDEN: readonly GrupoDeComparativa[] = ['invitacion', 'regalos', 'control', 'entrega']

type Columna = {
  nombre: string
  limites: Allowance
  /** El precio bajo el nombre, ya formateado por quien conoce la moneda. */
  precio?: ReactNode
  /** El de lista, tachado encima del de ahora, si el plan está de lanzamiento (0100). */
  precioAntes?: ReactNode
  /** El plan más elegido: su columna va resaltada de arriba abajo, como en la maqueta. */
  destacado?: boolean
}

type Props = {
  planes: readonly Columna[]
  textos: TextosComparativa & {
    title: string
    feature: string
    extrasTitle: string
    /** Los rótulos de los cuatro grupos y el del recuadro de lo que traen todos. */
    grupos: Record<GrupoDeComparativa, string>
    todosIncluyen: string
    /** La línea de la promoción, bajo la tabla. Solo se pinta si alguna columna lleva precio tachado. */
    notaLanzamiento?: string
    /** V4: el subtítulo, la nota de las rondas y el recuadro del álbum. Sin ellos no se pintan. */
    sub?: string
    nota?: string
    albumTitle?: string
    albumBody?: string
  }
  /** Lo que traen todos los planes, en líneas con check (las mismas de la portada). */
  incluyen?: readonly string[]
  /** Los extras que se ven en la celda del plan que no los trae («+Bs 150»), y el tope del álbum. */
  precios?: readonly PrecioDeFila[]
  notas?: Partial<Record<PrecioDeFila['fila'], NotaDeFila>>
}

/**
 * La tabla que compara los planes en la web. **Sus filas salen de los límites de la base**,
 * los mismos que corta el servidor: un texto escrito a mano acaba prometiendo lo que el
 * plan no trae, y eso ya pasó con «3D real» y «dominio propio».
 *
 * **Lo que traen todos no se repite en la tabla** (20 oct, maqueta del usuario): sube a un recuadro arriba,
 * y abajo quedan solo las filas donde los planes se diferencian, agrupadas por lo que son. Una tabla de
 * veinticinco filas con tres columnas de ✓ idénticos no compara nada: lo que se viene a ver es la diferencia.
 */
export function PlanComparison({ planes, textos, incluyen = [], precios = [], notas = {} }: Props) {
  const limites = planes.map((p) => p.limites)
  // «+Bs 150» en la celda del plan que no trae el extra pero lo puede comprar; «–» donde no se vende.
  const diferencias = conPreciosDeExtras(filasComparativas(limites, textos), limites, precios, notas)

  return (
    <div className="mt-16 rounded-[var(--radius-card)] border border-line bg-bg-raised/60 p-6 sm:p-10">
      <h3 className="text-center font-mono text-[11px] tracking-[var(--tracking-luxe)] text-ink-soft uppercase">{textos.title}</h3>

      {incluyen.length === 0 ? null : (
        <div className="mt-7 rounded-[18px] bg-pill-pending/60 px-6 py-5">
          <p className="font-mono text-[10px] tracking-[var(--tracking-luxe)] text-gold-deep uppercase">{textos.todosIncluyen}</p>
          <ul className="mt-3 grid gap-x-8 gap-y-2 text-[13.5px] leading-[1.6] text-ink-soft sm:grid-cols-2">
            {incluyen.map((linea) => (
              <li className="flex gap-2.5" key={linea}>
                <CheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-deep" />
                <span>{linea}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Celular: cada característica en su línea con las columnas debajo, y los nombres fijos arriba. */}
      <div className="mt-8 sm:hidden">
        <div className="sticky top-[84px] z-10 grid gap-2 border-b border-line bg-bg/95 py-3 backdrop-blur" style={{ gridTemplateColumns: `repeat(${planes.length}, minmax(0, 1fr))` }} aria-hidden>
          {planes.map((p) => (
            <span className="flex flex-col items-center gap-0.5" key={p.limites.planSlug}>
              <span className="font-display text-[17px] leading-tight text-ink">{p.nombre}</span>
              {p.precio === undefined ? null : <span className="font-mono text-[10px] text-gold-deep">{p.precio}</span>}
            </span>
          ))}
        </div>
        {ORDEN.map((grupo) => {
          const delGrupo = diferencias.filter((f) => f.grupo === grupo)
          if (delGrupo.length === 0) return null
          return (
            <section key={grupo}>
              <h4 className="pt-6 pb-2 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-gold-deep uppercase">{textos.grupos[grupo]}</h4>
              <dl>
                {delGrupo.map((fila) => (
                  <div className="border-b border-line py-3 last:border-none" key={fila.etiqueta}>
                    <dt className="text-[13px] leading-snug text-ink-soft">{fila.etiqueta}</dt>
                    <dd className="mt-2 grid gap-2" style={{ gridTemplateColumns: `repeat(${planes.length}, minmax(0, 1fr))` }}>
                      {fila.valores.map((celda, i) => (
                        <span
                          className={`text-center text-[14px] [font-variant-numeric:lining-nums] ${celda.incluido ? 'text-ink' : 'text-ink-mute'}`}
                          key={planes[i]?.limites.planSlug ?? i}
                        >
                          <span className="sr-only">{planes[i]?.nombre}: </span>
                          {celda.texto}
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )
        })}
      </div>

      <div className="relative mt-8 hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[600px] border-collapse text-left text-[14px]">
          <thead>
            <tr>
              <th className="sticky left-0 bg-bg-raised/60 py-4 pr-4 pl-5" scope="col">
                <span className="sr-only">{textos.feature}</span>
              </th>
              {planes.map((p) => (
                <th
                  className={`px-3 py-4 text-center align-bottom ${p.destacado ? 'rounded-t-[14px] bg-pill-pending/70' : ''}`}
                  key={p.limites.planSlug}
                  scope="col"
                >
                  <span className="block font-display text-[21px] leading-none font-light text-ink">{p.nombre}</span>
                  {p.precioAntes === undefined ? null : <span className="mt-1 block font-mono text-[10px] text-ink-mute line-through [font-variant-numeric:lining-nums]">{p.precioAntes}</span>}
                  {p.precio === undefined ? null : <span className="block font-mono text-[11px] text-gold-deep [font-variant-numeric:lining-nums]">{p.precio}</span>}
                </th>
              ))}
            </tr>
          </thead>
          {ORDEN.map((grupo) => {
            const delGrupo = diferencias.filter((f) => f.grupo === grupo)
            if (delGrupo.length === 0) return null
            return (
              <tbody key={grupo}>
                <tr>
                  <th className="sticky left-0 bg-bg-raised/60 pt-7 pb-2 pl-5 text-left font-mono text-[10px] font-normal tracking-[var(--tracking-luxe)] text-gold-deep uppercase" colSpan={1} scope="colgroup">
                    {textos.grupos[grupo]}
                  </th>
                  {planes.map((p) => (
                    <td className={`pt-7 pb-2 ${p.destacado ? 'bg-pill-pending/70' : ''}`} key={p.limites.planSlug} />
                  ))}
                </tr>
                {delGrupo.map((fila) => (
                  <tr className="border-t border-line" key={fila.etiqueta}>
                    <th className="sticky left-0 max-w-[42vw] bg-bg-raised/60 py-3 pr-4 pl-5 font-normal text-ink-soft" scope="row">
                      {fila.etiqueta}
                    </th>
                    {fila.valores.map((celda, i) => {
                      const columna = planes[i]
                      return (
                        <td
                          className={`px-3 py-3 text-center [font-variant-numeric:lining-nums] ${celda.incluido ? 'text-ink' : 'text-ink-mute'} ${columna?.destacado ? 'bg-pill-pending/70' : ''}`}
                          key={columna?.limites.planSlug ?? i}
                        >
                          {celda.texto}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            )
          })}
        </table>
      </div>

      {textos.notaLanzamiento === undefined || !planes.some((p) => p.precioAntes !== undefined) ? null : (
        <p className="mt-6 text-[12.5px] text-ink-mute">{textos.notaLanzamiento}</p>
      )}
      {textos.nota === undefined ? null : <p className="mt-1 text-[12.5px] text-ink-mute">{textos.nota}</p>}
    </div>
  )
}
