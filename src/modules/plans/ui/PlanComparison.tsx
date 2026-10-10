import type { ReactNode } from 'react'
import type { Allowance } from '../domain/allowance'
import { filasComparativas, type TextosComparativa } from '../domain/comparativa'

/** Lo del diseño por encargo de cada plan: rondas y días de entrega. `null`: autoservicio. */
export type EncargoDePlan = { rondas: number; dias: number } | null

type Props = {
  planes: ReadonlyArray<{ nombre: string; limites: Allowance; encargo?: EncargoDePlan }>
  textos: TextosComparativa & {
    title: string
    feature: string
    extrasTitle: string
    /** Las filas del encargo: «Rondas de corrección», «Entrega», «{n} días», «Tú la escribes». */
    rondas: string
    entrega: string
    entregaDias: string
    autoservicio: string
    /** V4: el subtítulo, la nota de las rondas y el recuadro del álbum. Sin ellos no se pintan. */
    sub?: string
    nota?: string
    albumTitle?: string
    albumBody?: string
  }
  /** Los extras a la venta, ya con su precio en palabras. Sin ninguno, no hay bloque. */
  extras?: ReadonlyArray<{ name: string; precio: ReactNode; descripcion?: string }>
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
  // Si algún plan es por encargo, la tabla dice cuántas rondas y en cuánto se entrega: son
  // datos de la base, los mismos que copia el encargo al empezar.
  if (planes.some((p) => p.encargo != null)) {
    const celda = (p: (typeof planes)[number], valor: (e: NonNullable<EncargoDePlan>) => string) =>
      p.encargo == null ? { texto: textos.autoservicio, incluido: false } : { texto: valor(p.encargo), incluido: true }
    // Van tras la galería, como en el documento de cambios; sin galería en la tabla, arriba.
    const tras = filas.findIndex((f) => f.clave === 'fotos') + 1
    filas.splice(
      tras,
      0,
      { clave: 'grupos', etiqueta: textos.rondas, valores: planes.map((p) => celda(p, (e) => String(e.rondas))) },
      { clave: 'grupos', etiqueta: textos.entrega, valores: planes.map((p) => celda(p, (e) => textos.entregaDias.replace('{n}', String(e.dias)))) },
    )
  }

  return (
    <div className="mt-16">
      <h3 className="text-center font-display text-[28px] font-light text-ink">{textos.title}</h3>
      {textos.sub === undefined ? null : <p className="mt-2 text-center text-[14px] text-ink-soft">{textos.sub}</p>}
      {/* Celular (9 oct, informe de lanzamiento): la tabla de 600 px obligaba a desplazarse de lado. Aquí cada
          característica va en su línea con las tres columnas debajo, y los nombres de los planes quedan fijos. */}
      <div className="mt-8 sm:hidden">
        <div className="sticky top-[84px] z-10 grid grid-cols-3 gap-2 border-b border-line bg-bg/95 py-3 backdrop-blur" aria-hidden>
          {planes.map((p) => (
            <span className="text-center font-display text-[18px] leading-tight text-ink" key={p.limites.planSlug}>
              {p.nombre}
            </span>
          ))}
        </div>
        <dl>
          {filas.map((fila) => (
            <div className="border-b border-line py-3 last:border-none" key={fila.etiqueta}>
              <dt className="text-[13px] leading-snug text-ink-soft">{fila.etiqueta}</dt>
              <dd className="mt-2 grid grid-cols-3 gap-2">
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
      </div>
      <div className="relative mt-8 hidden overflow-x-auto sm:block">
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
              <tr className="border-b border-line last:border-none" key={fila.etiqueta}>
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
      {textos.nota === undefined ? null : <p className="mt-4 text-[12.5px] text-ink-mute">{textos.nota}</p>}
      {textos.albumTitle === undefined || textos.albumBody === undefined ? null : (
        <div className="mt-8 flex flex-col items-start gap-2 rounded-[var(--radius-card)] border border-line bg-bg-raised/70 p-6 sm:flex-row sm:items-center sm:gap-6">
          <span className="font-mono text-[10px] tracking-[var(--tracking-luxe)] text-gold-deep uppercase">{textos.albumTitle}</span>
          <p className="text-[14px] leading-[1.7] text-ink-soft">{textos.albumBody}</p>
        </div>
      )}
      {extras.length === 0 ? null : (
        <div className="mt-14">
          <h3 className="text-center font-display text-[22px] font-light text-ink">{textos.extrasTitle}</h3>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {extras.map((x) => (
              <li className="flex items-center justify-between gap-4 rounded-[16px] border border-line bg-bg-raised/70 px-5 py-4 text-[14px] text-ink" key={x.name}>
                <span className="flex min-w-0 flex-col gap-1">
                  <span>{x.name}</span>
                  {x.descripcion ? <span className="text-[12.5px] leading-snug text-ink-soft">{x.descripcion}</span> : null}
                </span>
                <span className="shrink-0 font-display text-[20px] text-gold-deep [font-variant-numeric:lining-nums]">+{x.precio}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
