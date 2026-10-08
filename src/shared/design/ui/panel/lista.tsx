import Link from 'next/link'
import type { ReactNode } from 'react'
import { DotsIcon } from '../icons'
import { SelectorDeFiltro } from './SelectorDeFiltro'

/**
 * **Las piezas de las listas del admin**, una sola vez. Cartera, ventas, clientes y equipo se
 * pintaban cada una con su fila, su cabecera y sus cifras escritas a mano, y cada una se desviaba
 * a su manera (cifras en cuatro tarjetas altas en una, en línea en otra; la etapa a la derecha
 * aquí, debajo del nombre allá). Aquí se decide cómo es una fila y ya.
 */

/** La fiesta de un evento o de una venta. `null`: no se sabe todavía. */
export type FiestaDeLista = 'boda' | 'xv' | 'cumple' | null

const FIESTA: Record<Exclude<FiestaDeLista, null>, { texto: string; clases: string; punto: string; monograma: string }> = {
  boda: {
    texto: 'Boda',
    clases: 'bg-fiesta-boda-soft text-fiesta-boda-ink',
    punto: 'bg-fiesta-boda',
    monograma: 'bg-fiesta-boda-soft text-fiesta-boda-ink',
  },
  xv: {
    texto: 'XV',
    clases: 'bg-fiesta-xv-soft text-fiesta-xv-ink',
    punto: 'bg-fiesta-xv',
    monograma: 'bg-fiesta-xv-soft text-fiesta-xv-ink',
  },
  cumple: {
    texto: 'Cumpleaños',
    clases: 'bg-fiesta-cumple-soft text-fiesta-cumple-ink',
    punto: 'bg-fiesta-cumple',
    monograma: 'bg-fiesta-cumple-soft text-fiesta-cumple-ink',
  },
}

export const nombreDeFiesta = (fiesta: FiestaDeLista): string => (fiesta === null ? 'Sin fiesta' : FIESTA[fiesta].texto)
export const puntoDeFiesta = (fiesta: FiestaDeLista): string => (fiesta === null ? 'bg-ink-mute/40' : FIESTA[fiesta].punto)

/** «Boda», «XV», «Cumpleaños» con su color. El color acompaña a la palabra, nunca la sustituye. */
export function EtiquetaDeFiesta({ fiesta }: { fiesta: FiestaDeLista }) {
  if (fiesta === null) return null
  const f = FIESTA[fiesta]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] tracking-[0.14em] uppercase ${f.clases}`}>
      <span aria-hidden className={`size-1.5 rounded-full ${f.punto}`} />
      {f.texto}
    </span>
  )
}

/** La inicial en Cormorant sobre el color de la fiesta: se reconoce a la persona antes de leerla. */
export function Monograma({ nombre, fiesta = null, grande = false }: { nombre: string; fiesta?: FiestaDeLista; grande?: boolean }) {
  const inicial = nombre.trim().charAt(0).toUpperCase() || '·'
  const tono = fiesta === null ? 'bg-bg-sunken text-ink-soft' : FIESTA[fiesta].monograma
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full font-display ring-1 ring-white/70 ring-inset ${tono} ${
        grande ? 'size-12 text-[24px]' : 'size-9 text-[17px]'
      }`}
    >
      {inicial}
    </span>
  )
}

/** Tono del semáforo de salud de un evento. */
export type TonoDeSalud = 'ok' | 'warn' | 'risk'

const SALUD: Record<TonoDeSalud, { punto: string; texto: string }> = {
  ok: { punto: 'bg-ok', texto: 'text-ok-deep' },
  warn: { punto: 'bg-warn', texto: 'text-warn-deep' },
  risk: { punto: 'bg-danger', texto: 'text-danger-deep' },
}

/** El punto y **la razón en palabras**: «Invitación sin escribir · faltan 40 días». */
export function Semaforo({ tono, children }: { tono: TonoDeSalud; children: ReactNode }) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-2 text-[12px] ${SALUD[tono].texto}`}>
      <span aria-hidden className={`size-2 shrink-0 rounded-full ${SALUD[tono].punto} ${tono === 'risk' ? 'motion-safe:animate-pulse' : ''}`} />
      <span className="truncate">{children}</span>
    </span>
  )
}

/** Un importe grande: la moneda en mono pequeña delante, la cifra en Cormorant con números alineados. */
export function Importe({ texto, tamano = 'grande' }: { texto: string; tamano?: 'grande' | 'fila' }) {
  const [moneda, ...resto] = texto.split(/\s+/)
  const cifra = resto.join(' ')
  return (
    <span className="inline-flex items-baseline gap-1.5 text-ink">
      <span className="font-mono text-[10.5px] tracking-[0.12em] text-ink-mute uppercase">{cifra === '' ? '' : moneda}</span>
      <span className={`font-display leading-none [font-variant-numeric:lining-nums] ${tamano === 'grande' ? 'text-[34px]' : 'text-[18px]'}`}>{cifra === '' ? moneda : cifra}</span>
    </span>
  )
}

export type Cifra = { readonly label: string; readonly value: string | number; readonly detail?: string | undefined; readonly href?: string | undefined; readonly tono?: 'normal' | 'alerta' }

/**
 * Las cifras de una pantalla **en una sola franja**, separadas por filetes: lo que eran cuatro
 * tarjetas altas que llenaban la primera pantalla del celular antes de la lista.
 */
export function TiraDeCifras({ cifras }: { cifras: readonly Cifra[] }) {
  return (
    <dl className="mb-5 grid grid-cols-2 overflow-hidden rounded-[18px] border border-line-panel bg-white/70 shadow-card min-[760px]:flex min-[760px]:divide-x min-[760px]:divide-line-panel">
      {cifras.map((c) => {
        const cuerpo = (
          <>
            <dt className="font-mono text-[9.5px] tracking-[0.18em] text-ink-mute uppercase">{c.label}</dt>
            <dd className={`mt-1 font-display text-[26px] leading-none [font-variant-numeric:lining-nums] ${c.tono === 'alerta' ? 'text-danger-deep' : 'text-ink'}`}>{c.value}</dd>
            {c.detail === undefined ? null : <dd className="mt-1 truncate text-[11.5px] text-ink-mute">{c.detail}</dd>}
          </>
        )
        return (
          <div className="min-w-0 flex-1 border-line-panel max-[759px]:border-b max-[759px]:odd:border-r" key={c.label}>
            {c.href === undefined ? (
              <div className="px-4.5 py-3.5">{cuerpo}</div>
            ) : (
              <Link className="block px-4.5 py-3.5 transition-colors hover:bg-bg-sunken/60" href={c.href}>
                {cuerpo}
              </Link>
            )}
          </div>
        )
      })}
    </dl>
  )
}

/** Las columnas de una lista, en mono pequeña. Se ocultan en el celular, donde la fila se apila. */
export function EncabezadoDeLista({ columnas, plantilla }: { columnas: readonly string[]; plantilla: string }) {
  return (
    <div aria-hidden className={`hidden gap-4 border-b border-line-panel px-3 pb-2.5 font-mono text-[9.5px] tracking-[0.18em] text-ink-mute uppercase min-[860px]:grid ${plantilla}`}>
      {columnas.map((c, i) => (
        <span className={i === columnas.length - 1 && columnas.length > 2 ? 'text-right' : ''} key={c}>
          {c}
        </span>
      ))}
    </div>
  )
}

/**
 * Una fila de lista, **entera clicable**, con el monograma, el nombre en Cormorant, el detalle y
 * las columnas de la derecha. Las acciones de fila no van aquí: van en la ficha que abre.
 */
export function FilaDeLista({
  href,
  nombre,
  fiesta = null,
  detalle,
  plantilla,
  children,
  destacada = false,
}: {
  href: string
  nombre: string
  fiesta?: FiestaDeLista
  detalle?: ReactNode
  /** La rejilla de escritorio, la misma que su `EncabezadoDeLista`. */
  plantilla: string
  /** Las columnas de la derecha. */
  children?: ReactNode
  destacada?: boolean
}) {
  return (
    <li>
      <Link
        className={`group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 rounded-[14px] px-3 py-3 transition-colors hover:bg-bg-sunken/70 focus-visible:outline-2 focus-visible:outline-ink min-[860px]:gap-y-0 ${plantilla} ${
          destacada ? 'bg-gold/7 shadow-[inset_2px_0_0_var(--color-gold)]' : ''
        }`}
        href={href}
        scroll={false}
      >
        <span className="flex min-w-0 items-center gap-3">
          <Monograma fiesta={fiesta} nombre={nombre} />
          <span className="min-w-0">
            <span className="block truncate font-display text-[17px] leading-tight text-ink">{nombre}</span>
            {detalle === undefined ? null : <span className="block truncate text-[12px] text-ink-mute">{detalle}</span>}
          </span>
        </span>
        {children}
      </Link>
    </li>
  )
}

/**
 * «⋯»: las acciones que no son la principal. `<details>` nativo —sin estado, sin JavaScript—; las
 * que no se deshacen van en rojo y con su `ConfirmAction` dentro.
 */
export function MenuDeAcciones({ children, etiqueta = 'Más acciones' }: { children: ReactNode; etiqueta?: string }) {
  return (
    <details className="relative">
      <summary
        aria-label={etiqueta}
        className="flex size-9 cursor-pointer list-none items-center justify-center rounded-full border max-[859px]:size-11 border-line-panel-strong bg-white text-ink-soft shadow-card transition-colors hover:border-ink hover:text-ink [&::-webkit-details-marker]:hidden"
      >
        <DotsIcon className="size-4" />
      </summary>
      <div className="absolute top-[calc(100%+8px)] right-0 z-40 flex w-[240px] flex-col gap-0.5 rounded-[16px] border border-line-panel bg-bg-raised p-1.5 shadow-lift [&>*]:w-full">
        {children}
      </div>
    </details>
  )
}

/** Clases de una opción dentro de `MenuDeAcciones`. */
export const opcionDeMenu = (peligro = false) =>
  `flex w-full cursor-pointer items-center gap-2 rounded-[10px] px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-bg-sunken max-[859px]:min-h-11 ${peligro ? 'text-danger-deep' : 'text-ink'}`

export type OpcionDeFiltro = { readonly key: string; readonly label: string; readonly href: string; readonly count?: number }

/**
 * **La barra de filtros de toda lista del admin**: la etapa (segmentado en escritorio, un
 * `<select>` en el celular, donde seis píldoras no caben y se cortaban sin avisar), los chips de
 * fiesta, el buscador y, si lo hay, el conmutador de vista. Una sola forma de filtrar.
 */
export function BarraDeFiltros({
  etiqueta,
  actual,
  opciones,
  fiestas,
  busqueda,
  vista,
}: {
  etiqueta: string
  actual: string
  opciones: readonly OpcionDeFiltro[]
  fiestas?: { readonly actual: string; readonly opciones: readonly (OpcionDeFiltro & { fiesta: FiestaDeLista })[] }
  busqueda?: { readonly accion: string; readonly valor: string; readonly placeholder: string; readonly ocultos: Readonly<Record<string, string>> }
  vista?: ReactNode
}) {
  return (
    <div className="mb-4 flex flex-col gap-3">
      {opciones.length === 0 ? null : (
        <>
          <nav aria-label={etiqueta} className="hidden min-[860px]:block">
            <ul className="flex flex-wrap gap-1 rounded-[22px] border border-line-panel bg-white/70 p-1">
              {opciones.map((o) => (
                <li key={o.key}>
                  <Link
                    aria-current={o.key === actual ? 'page' : undefined}
                    className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors ${
                      o.key === actual ? 'bg-ink text-white' : 'text-ink-soft hover:bg-bg-sunken hover:text-ink'
                    }`}
                    href={o.href}
                    scroll={false}
                  >
                    {o.label}
                    {o.count === undefined ? null : (
                      <span className={`font-mono text-[10.5px] ${o.key === actual ? 'text-white/70' : 'text-ink-mute'}`}>{o.count}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="min-[860px]:hidden">
            <SelectorDeFiltro actual={actual} etiqueta={etiqueta} opciones={opciones} />
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {fiestas === undefined
          ? null
          : fiestas.opciones.map((o) => (
              <Link
                aria-current={o.key === fiestas.actual ? 'true' : undefined}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] transition-colors max-[859px]:min-h-11 max-[859px]:px-3.5 max-[859px]:text-[13px] ${
                  o.key === fiestas.actual ? 'border-ink bg-white text-ink shadow-card' : 'border-line-panel text-ink-soft hover:border-ink/40'
                }`}
                href={o.href}
                key={o.key}
                scroll={false}
              >
                <span aria-hidden className={`size-2 rounded-full ${o.fiesta === null ? 'bg-linear-to-br from-fiesta-boda via-fiesta-xv to-fiesta-cumple' : puntoDeFiesta(o.fiesta)}`} />
                {o.label}
                {o.count === undefined ? null : <span className="font-mono text-[10.5px] text-ink-mute">{o.count}</span>}
              </Link>
            ))}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 max-[559px]:basis-full">
          {busqueda === undefined ? null : (
            <form action={busqueda.accion} className="flex min-w-0 flex-1 items-center min-[560px]:max-w-[320px]" method="get" role="search">
              {Object.entries(busqueda.ocultos).map(([k, v]) => (
                <input key={k} name={k} type="hidden" value={v} />
              ))}
              <label className="sr-only" htmlFor="buscar-en-lista">
                {busqueda.placeholder}
              </label>
              <input
                className="w-full min-w-0 rounded-full border border-line-panel-strong bg-white px-4 py-2 text-[13px] text-ink outline-none max-[859px]:min-h-11 max-[859px]:text-[16px] placeholder:text-ink-mute focus:border-ink"
                defaultValue={busqueda.valor}
                id="buscar-en-lista"
                name="q"
                placeholder={busqueda.placeholder}
                type="search"
              />
            </form>
          )}
          {vista === undefined ? null : <div className="shrink-0">{vista}</div>}
        </div>
      </div>
    </div>
  )
}

/** El conmutador Tablero / Lista (o Cartera / Calendario): dos enlaces, la vista en la dirección. */
export function ConmutadorDeVista({ opciones, actual }: { opciones: readonly { key: string; label: string; href: string; icono: ReactNode }[]; actual: string }) {
  return (
    <nav aria-label="Vista" className="flex rounded-full border border-line-panel bg-white/70 p-1">
      {opciones.map((o) => (
        <Link
          aria-current={o.key === actual ? 'page' : undefined}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] transition-colors max-[859px]:min-h-11 max-[859px]:px-4 max-[859px]:text-[13px] ${o.key === actual ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'}`}
          href={o.href}
          key={o.key}
          scroll={false}
        >
          {o.icono}
          {o.label}
        </Link>
      ))}
    </nav>
  )
}
