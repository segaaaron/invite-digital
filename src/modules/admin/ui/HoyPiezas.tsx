import Link from 'next/link'
import { PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import type { Aviso, Proxima } from '../domain/hoy'

/**
 * Las piezas de «Hoy». Sin estado y sin acciones: todo lo que se hace desde aquí se hace
 * en la pantalla a la que lleva cada enlace, que es donde ya vive la lógica.
 */

/**
 * Una cifra que lleva a su bandeja. **Encendida solo si hay algo**: cuatro tarjetas con el
 * mismo peso y tres de ellas a cero hacen que la que importa no se vea.
 */
export function HoyTile({ label, value, href, detail }: { label: string; value: number; href: string; detail: string }) {
  const hayAlgo = value > 0
  return (
    <Link
      className={`group relative flex flex-col overflow-hidden rounded-[18px] border p-4 shadow-card transition-all duration-200 hover:-translate-y-px hover:shadow-float min-[560px]:p-5.5 ${
        hayAlgo ? 'border-gold/45 bg-linear-to-b from-[rgb(var(--color-gold-rgb)/0.10)] to-white' : 'border-line-panel bg-linear-to-b from-bg-top to-white'
      }`}
      href={href}
    >
      {hayAlgo ? <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-gold" /> : null}
      <span className="font-mono text-[9px] tracking-[0.35em] text-ink-mute uppercase">{label}</span>
      <span
        className={`mt-2 font-display text-[40px] leading-none font-light [font-variant-numeric:lining-nums] min-[560px]:text-[48px] ${hayAlgo ? 'text-ink' : 'text-ink-mute/60'}`}
      >
        {value}
      </span>
      <span className="mt-2 flex items-center justify-between gap-2 text-[12px] text-ink-soft">
        {hayAlgo ? detail : 'Al día'}
        <span aria-hidden className="text-ink-mute transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </span>
    </Link>
  )
}

/** Cuántos avisos se enseñan por grupo antes de plegar el resto. */
const TOPE = 5

function FilaAviso({ aviso }: { aviso: Aviso }) {
  return (
    <li className="flex flex-col gap-2 border-t border-line-panel py-3.5 min-[560px]:flex-row min-[560px]:items-center min-[560px]:gap-4">
      <span className="w-[118px] shrink-0">
        <Pill tone={aviso.tono}>{aviso.etiqueta}</Pill>
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[14px] text-ink">{aviso.titulo}</span>
        <span className="text-[12px] text-ink-mute">{aviso.detalle}</span>
      </span>
      <PanelButton className="self-start min-[560px]:self-auto" href={aviso.href}>
        {aviso.accion}
      </PanelButton>
    </li>
  )
}

/**
 * Un grupo de avisos. Los que pasan del tope **se despliegan aquí mismo**, no con un
 * enlace: un grupo mezcla clases —comprobantes y cambios de plan, accesos y pedidos sin
 * pago— y ningún enlace a una sola bandeja lleva a todos. La primera versión mandaba «Y N
 * más» a las consultas aunque lo escondido fueran pedidos, y en «Bodas en riesgo», sin
 * enlace, escondía la sexta boda sin decirlo.
 */
export function AvisoGrupo({ titulo, avisos, vacio }: { titulo: string; avisos: readonly Aviso[]; vacio: string }) {
  const visibles = avisos.slice(0, TOPE)
  const resto = avisos.slice(TOPE)

  return (
    <section className="flex flex-col">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h3 className="font-mono text-[10px] tracking-[0.3em] text-ink-mute uppercase">{titulo}</h3>
        <span className="font-mono text-[10px] text-ink-mute [font-variant-numeric:lining-nums]">{avisos.length}</span>
      </div>

      {avisos.length === 0 ? (
        <p className="border-t border-line-panel py-3.5 text-[13px] text-ink-mute">{vacio}</p>
      ) : (
        <ul className="flex flex-col">
          {visibles.map((aviso) => (
            <FilaAviso key={aviso.clave} aviso={aviso} />
          ))}
        </ul>
      )}

      {resto.length > 0 ? (
        <details className="group">
          <summary className="cursor-pointer list-none border-t border-line-panel pt-3 font-mono text-[10px] tracking-[0.25em] text-ink-soft uppercase hover:text-ink">
            <span className="group-open:hidden">Ver {resto.length} más</span>
            <span className="hidden group-open:inline">Ver menos</span>
          </summary>
          <ul className="flex flex-col">
            {resto.map((aviso) => (
              <FilaAviso key={aviso.clave} aviso={aviso} />
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  )
}

const DIA = new Intl.DateTimeFormat('es-BO', { day: 'numeric', timeZone: 'UTC' })
const MES = new Intl.DateTimeFormat('es-BO', { month: 'short', timeZone: 'UTC' })
const SEMANA = new Intl.DateTimeFormat('es-BO', { weekday: 'long', timeZone: 'UTC' })

const ESTADO: Record<string, { label: string; tone: 'ok' | 'pending' | 'no' }> = {
  live: { label: 'Publicada', tone: 'ok' },
  draft: { label: 'Borrador', tone: 'no' },
  closed: { label: 'Cerrada', tone: 'pending' },
}

export function ProximaFila({ boda }: { boda: Proxima }) {
  const fecha = new Date(`${boda.eventDate}T00:00:00Z`)
  const estado = ESTADO[boda.status] ?? { label: boda.status, tone: 'pending' as const }
  const porcentaje = boda.ratio === null ? null : Math.round(boda.ratio * 100)

  return (
    <li className="border-t border-line-panel first:border-none">
      <Link className="-mx-2 flex items-center gap-4 rounded-xl px-2 py-3.5 transition-colors hover:bg-bg-sunken/50" href={`/panel/eventos/${boda.slug}`}>
        <span className="flex w-12 shrink-0 flex-col items-center rounded-xl border border-line-panel bg-white py-1.5 shadow-card">
          <span className="font-display text-[24px] leading-none text-ink [font-variant-numeric:lining-nums]">{DIA.format(fecha)}</span>
          <span className="font-mono text-[8px] tracking-[0.25em] text-ink-mute uppercase">{MES.format(fecha).replace('.', '')}</span>
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-[14px] text-ink">{boda.title}</span>
            <Pill tone={estado.tone}>{estado.label}</Pill>
          </span>
          <span className="text-[11px] text-ink-mute first-letter:uppercase">
            {SEMANA.format(fecha)} · {boda.dias === 0 ? 'hoy' : boda.dias === 1 ? 'mañana' : `en ${boda.dias} días`}
          </span>
          {porcentaje === null ? (
            <span className="text-[11px] text-danger">Sin grupos de invitados cargados</span>
          ) : (
            <span className="flex items-center gap-2.5">
              <span
                aria-label={`${boda.respondidos} de ${boda.grupos} grupos respondieron`}
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-sunken"
                role="img"
              >
                <span className="block h-full rounded-full bg-sage" style={{ width: `${porcentaje}%` }} />
              </span>
              <span className="font-mono text-[10px] text-ink-soft [font-variant-numeric:lining-nums]">
                {boda.respondidos}/{boda.grupos} RSVP
              </span>
            </span>
          )}
        </span>
      </Link>
    </li>
  )
}
