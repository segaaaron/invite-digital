import Link from 'next/link'
import { requireAdmin } from '@/app/_acciones/sesion'
import { borrarTipoDeFalloAction } from '@/app/_acciones/admin/fallos-actions'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { EmptyState } from '@/shared/design/ui/panel/estados'
import { CheckIcon } from '@/shared/design/ui/icons'
import { hace } from '@/shared/format/fecha'
import { tiposDeFallo } from '@/shared/observability/lectura'

export const metadata = { title: 'Registro de fallos · Administración' }
export const dynamic = 'force-dynamic'

const PERIODOS = [
  { dias: 1, rotulo: 'Hoy' },
  { dias: 7, rotulo: '7 días' },
  { dias: 30, rotulo: '30 días' },
] as const
const ORIGENES = [
  { valor: null, rotulo: 'Todos' },
  { valor: 'servidor', rotulo: 'Servidor' },
  { valor: 'navegador', rotulo: 'Navegador' },
] as const

/**
 * Ajustes › Registro de fallos: **qué servicio falló, cuántas veces y por qué**. Cada tipo (misma huella:
 * servicio y mensaje) es una fila con su última causa entera —la pila, la ruta, la acción— para arreglarlo
 * sin adivinar. «Ya está arreglado» lo borra. Se guardan 30 días.
 */
export default async function FallosPage({ searchParams }: { searchParams: Promise<{ dias?: string; origen?: string }> }) {
  await requireAdmin()
  const p = await searchParams
  const dias = PERIODOS.find((x) => String(x.dias) === p.dias)?.dias ?? 7
  const origen = p.origen === 'servidor' || p.origen === 'navegador' ? p.origen : null
  const tipos = await tiposDeFallo(dias, origen)
  const total = tipos.reduce((s, t) => s + t.veces, 0)
  const ahora = new Date()
  const enlace = (d: number, o: string | null) => `/panel/admin/fallos?dias=${d}${o === null ? '' : `&origen=${o}`}`

  return (
    <>
      <PanelHeader kicker="Ajustes" meta="Qué servicio falló, cuántas veces y por qué, con la causa completa" title="Registro de fallos" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {PERIODOS.map((x) => (
          <Link
            aria-current={x.dias === dias ? 'page' : undefined}
            className={`rounded-full border px-3.5 py-1.5 text-[12.5px] ${x.dias === dias ? 'border-ink bg-ink text-white' : 'border-line-panel-strong bg-white text-ink-soft hover:border-ink'}`}
            href={enlace(x.dias, origen)}
            key={x.dias}
          >
            {x.rotulo}
          </Link>
        ))}
        <span aria-hidden className="mx-1 h-5 w-px bg-line-panel" />
        {ORIGENES.map((x) => (
          <Link
            aria-current={x.valor === origen ? 'page' : undefined}
            className={`rounded-full border px-3.5 py-1.5 text-[12.5px] ${x.valor === origen ? 'border-ink bg-ink text-white' : 'border-line-panel-strong bg-white text-ink-soft hover:border-ink'}`}
            href={enlace(dias, x.valor)}
            key={x.rotulo}
          >
            {x.rotulo}
          </Link>
        ))}
        <span className="ml-auto text-[12.5px] text-ink-mute">{`${tipos.length} ${tipos.length === 1 ? 'tipo' : 'tipos'} · ${total} ${total === 1 ? 'vez' : 'veces'}`}</span>
      </div>

      {tipos.length === 0 ? (
        <PanelCard>
          <EmptyState description="Cuando un servicio falle, aquí verás cuál, cuántas veces y la causa exacta." icon={<CheckIcon />} title="Sin fallos en este periodo" />
        </PanelCard>
      ) : (
        <ul className="flex flex-col gap-3">
          {tipos.map((t) => (
            <li key={t.huella}>
              <details className="group rounded-[16px] border border-line-panel bg-white shadow-card open:border-line-panel-strong">
                <summary className="flex cursor-pointer list-none items-start gap-4 px-5 py-4">
                  <span className={`mt-0.5 grid min-w-9 shrink-0 place-items-center rounded-full px-2 py-1 font-mono text-[11.5px] ${t.veces > 9 ? 'bg-danger/12 text-danger-deep' : 'bg-bg-top text-ink-soft'}`}>{t.veces}×</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-[14px] leading-snug text-ink">{t.mensaje}</span>
                    <span className="font-codigo text-[11px] tracking-[0.04em] text-ink-mute">
                      {t.servicio} · {t.origen} · último {hace(t.ultimo, ahora)}
                      {t.veces > 1 ? ` · primero ${hace(t.primero, ahora)}` : ''}
                    </span>
                  </span>
                </summary>
                <div className="flex flex-col gap-3 border-t border-line-panel px-5 py-4">
                  <dl className="grid gap-2 text-[12.5px] min-[640px]:grid-cols-[110px_minmax(0,1fr)]">
                    <dt className="text-ink-mute">Ruta</dt>
                    <dd className="m-0 font-codigo break-all text-ink">{t.ruta ?? '—'}</dd>
                    <dt className="text-ink-mute">Acción</dt>
                    <dd className="m-0 font-codigo break-all text-ink">{t.accion ?? '—'}</dd>
                  </dl>
                  <pre className="max-h-96 overflow-auto rounded-[12px] bg-shell-deep p-4 font-codigo text-[11.5px] leading-relaxed whitespace-pre-wrap text-shell-ink">{t.detalle || 'Sin más detalle.'}</pre>
                  <form action={borrarTipoDeFalloAction} className="flex justify-end">
                    <input name="huella" type="hidden" value={t.huella} />
                    <button className="rounded-full border border-line-panel-strong bg-white px-4 py-2 text-[12.5px] text-ink hover:border-ink" type="submit">
                      Ya está arreglado: borrar
                    </button>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
