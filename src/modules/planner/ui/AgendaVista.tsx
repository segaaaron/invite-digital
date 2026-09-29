import Link from 'next/link'
import type { ClaseDeAgenda, EntradaDeAgenda } from '../domain/agenda'
import { NOMBRE_DE_CLASE } from '../domain/agenda'

/** Cada clase con su color de la paleta, y siempre con su nombre al lado: el color acompaña, no dice. */
export const TONO: Record<ClaseDeAgenda, string> = {
  evento: 'bg-gold text-on-gold',
  confirmacion: 'bg-ink text-white',
  tarea: 'bg-sage-light text-sage-deep',
  pago: 'bg-pill-maybe text-pill-maybe-ink',
  momento: 'bg-gold-light text-gold-deep',
  ensayo: 'bg-pill-pending text-pill-pending-ink',
  cita: 'bg-bg-top text-ink ring-1 ring-line-panel-strong',
}

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export const nombreDelMes = (mes: string) => {
  const [a, m] = mes.split('-')
  return `${MESES[Number(m) - 1]} ${a}`
}

/** «mar 14 oct» para la lista. */
export function diaCorto(dia: string): string {
  const fecha = new Date(`${dia}T12:00:00Z`)
  const semana = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][fecha.getUTCDay()]
  return `${semana} ${fecha.getUTCDate()} ${MESES[fecha.getUTCMonth()]!.slice(0, 3)}`
}

/**
 * La vista de mes: cada casilla con sus entradas (tres y «+N»). En el celular, puntos de color en vez de
 * texto; tocar el día abre su lista (`?dia=`).
 */
export function MesDeAgenda({ semanas, entradas, hoy, base, diaElegido }: { semanas: (string | null)[][]; entradas: readonly EntradaDeAgenda[]; hoy: string; base: string; diaElegido: string | null }) {
  const porDia = new Map<string, EntradaDeAgenda[]>()
  for (const e of entradas) porDia.set(e.dia, [...(porDia.get(e.dia) ?? []), e])
  return (
    <div className="overflow-hidden rounded-[14px] border border-line-panel">
      <div className="grid grid-cols-7 border-b border-line-panel bg-bg-top/60">
        {DIAS.map((d) => (
          <span className="px-2 py-2 text-center text-[10.5px] font-medium tracking-[0.1em] text-ink-mute uppercase" key={d}>
            {d}
          </span>
        ))}
      </div>
      {semanas.map((semana, i) => (
        <div className="grid grid-cols-7 border-b border-line-panel last:border-b-0" key={i}>
          {semana.map((dia, j) => {
            if (dia === null) return <span aria-hidden className="min-h-14 border-r border-line-panel bg-bg-top/30 last:border-r-0 min-[700px]:min-h-24" key={j} />
            const delDia = porDia.get(dia) ?? []
            const elegido = dia === diaElegido
            return (
              <Link
                aria-label={`${diaCorto(dia)}${delDia.length === 0 ? '' : `, ${delDia.length} en la agenda`}`}
                className={`group flex min-h-14 flex-col gap-1 border-r border-line-panel p-1.5 transition-colors last:border-r-0 hover:bg-bg-top/60 min-[700px]:min-h-24 ${elegido ? 'bg-bg-top' : 'bg-white'}`}
                href={`${base}&dia=${dia}`}
                key={j}
                scroll={false}
              >
                <span className={`grid size-6 place-items-center rounded-full text-[12px] tabular-nums ${dia === hoy ? 'bg-ink text-white' : 'text-ink-soft'}`}>{Number(dia.slice(8))}</span>
                {/* Celular: puntos. */}
                <span className="flex flex-wrap gap-0.5 min-[700px]:hidden">
                  {delDia.slice(0, 4).map((e) => (
                    <span aria-hidden className={`size-1.5 rounded-full ${TONO[e.clase].split(' ')[0]}`} key={`${e.clase}-${e.id}`} />
                  ))}
                </span>
                {/* Pantalla ancha: las tres primeras con su texto. */}
                <span className="hidden flex-col gap-0.5 min-[700px]:flex">
                  {delDia.slice(0, 3).map((e) => (
                    <span className={`truncate rounded-[5px] px-1.5 py-0.5 text-[10.5px] leading-tight ${TONO[e.clase]} ${e.hecha ? 'line-through opacity-60' : ''}`} key={`${e.clase}-${e.id}`}>
                      {e.hora === null ? '' : `${e.hora} `}
                      {e.titulo}
                    </span>
                  ))}
                  {delDia.length > 3 ? <span className="px-1 text-[10.5px] text-ink-mute">+{delDia.length - 3} más</span> : null}
                </span>
              </Link>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/** Una lista de entradas, agrupada por día. Cada una lleva a donde se edita. */
export function ListaDeAgenda({ entradas, enlace, vacio }: { entradas: readonly EntradaDeAgenda[]; enlace: (e: EntradaDeAgenda) => string; vacio: string }) {
  if (entradas.length === 0) return <p className="text-[13px] text-ink-mute">{vacio}</p>
  const dias = [...new Set(entradas.map((e) => e.dia))]
  return (
    <ol className="flex flex-col gap-4">
      {dias.map((dia) => (
        <li className="flex flex-col gap-1.5" key={dia}>
          <p className="text-[11px] font-medium tracking-[0.1em] text-ink-mute uppercase">{diaCorto(dia)}</p>
          <ul className="flex flex-col gap-1.5">
            {entradas
              .filter((e) => e.dia === dia)
              .map((e) => (
                <li key={`${e.clase}-${e.id}`}>
                  <Link className="flex items-start gap-3 rounded-[12px] border border-line-panel bg-white px-3 py-2.5 transition-colors hover:border-line-panel-strong" href={enlace(e)}>
                    <span className="w-11 shrink-0 pt-0.5 font-mono text-[11.5px] text-ink-soft tabular-nums">{e.hora ?? '—'}</span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className={`text-[13.5px] leading-snug text-ink ${e.hecha ? 'line-through opacity-60' : ''}`}>{e.titulo}</span>
                      {e.detalle ? <span className="truncate text-[12px] text-ink-mute">{e.detalle}</span> : null}
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] ${TONO[e.clase]}`}>{NOMBRE_DE_CLASE[e.clase]}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}
