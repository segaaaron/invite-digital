import Link from 'next/link'
import { requireAdmin } from '@/app/_acciones/sesion'
import { borrarTipoDeFalloAction } from '@/app/_acciones/admin/fallos-actions'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PestanasDeAdmin } from '@/modules/admin'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { EmptyState } from '@/shared/design/ui/panel/estados'
import { CheckIcon } from '@/shared/design/ui/icons'
import { hace } from '@/shared/format/fecha'
import { explicarFallo } from '@/shared/observability/explicar'
import { tiposDeFallo } from '@/shared/observability/lectura'
import { describirDispositivo } from '@/modules/identity'

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
 * Ajustes › Registro de fallos: **qué falló, dónde, cuántas veces y qué significa**, en palabras
 * (`explicarFallo`). Cada tipo (misma huella: servicio y mensaje) es una fila; el SQL, la pila y la acción
 * van plegados en «Ver detalle técnico». «Ya está arreglado» lo borra. Se guardan 30 días.
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
      <PanelHeader title="Ajustes" tituloEnCelular="Registro de fallos" bajoPestanas="Solo lo que se rompió, dicho en palabras. Cuando lo arregles, bórralo: si vuelve a pasar, aparece otra vez." pestanas={<PestanasDeAdmin />} />
      <div className="mb-6 flex flex-wrap items-center gap-2.5">
        {PERIODOS.map((x) => (
          <Link
            aria-current={x.dias === dias ? 'page' : undefined}
            className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-[13.5px] font-medium no-underline max-[859px]:min-h-11 ${x.dias === dias ? 'border-shell-deep bg-shell-deep text-shell-ink' : 'border-line-panel-strong bg-bg-raised text-ink hover:border-gold'}`}
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
            className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-[13.5px] font-medium no-underline max-[859px]:min-h-11 ${x.valor === origen ? 'border-shell-deep bg-shell-deep text-shell-ink' : 'border-line-panel-strong bg-bg-raised text-ink hover:border-gold'}`}
            href={enlace(dias, x.valor)}
            key={x.rotulo}
          >
            {x.rotulo}
          </Link>
        ))}
        <span className="ml-auto text-[13.5px] text-ink-mute">{`${tipos.length} ${tipos.length === 1 ? 'fallo distinto' : 'fallos distintos'} · ${total} ${total === 1 ? 'vez' : 'veces'} en total`}</span>
      </div>

      {tipos.length === 0 ? (
        <PanelCard>
          <EmptyState description="Cuando un servicio falle, aquí verás cuál, cuántas veces y la causa exacta." icon={<CheckIcon />} title="Sin fallos en este periodo" />
        </PanelCard>
      ) : (
        <>
        <ul className="flex flex-col gap-3.5">
          {tipos.map((t, n) => {
            const e = explicarFallo(t)
            // Los fallos del navegador traen su agente en la primera línea (la voz de Luxury): «iPhone · Safari».
            const agente = t.origen === 'navegador' ? (t.detalle.split('\n')[0] ?? '') : ''
            const aparato = agente.startsWith('Mozilla/') ? describirDispositivo(agente) : null
            return (
              // La tarjeta de la maqueta (E06): el aviso, qué pasó y dónde, cuántas veces, y «Ya está arreglado» a la vista.
              <li className="rounded-[16px] border border-line-panel bg-bg-raised px-5.5 py-5" key={t.huella}>
                <div className="flex flex-wrap items-start gap-3.5">
                  <svg aria-hidden className="mt-0.5 size-5 shrink-0 text-danger" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M12 4 3 20h18L12 4zM12 10v4M12 17h.01" />
                  </svg>
                  <div className="min-w-0 flex-[1_1_300px]">
                    <p className="font-medium">{e.titulo}</p>
                    <p className="text-[13.5px] text-ink-mute">
                      {t.origen === 'navegador' ? `En el navegador${aparato === null ? '' : `, ${aparato}`}` : 'En el servidor'}. En {e.donde}. Pasó {t.veces === 1 ? '1 vez' : `${t.veces} veces`}, la última {hace(t.ultimo, ahora)}
                      {t.veces > 1 ? ` (la primera ${hace(t.primero, ahora)})` : ''}.
                    </p>
                  </div>
                  <form action={borrarTipoDeFalloAction}>
                    <input name="huella" type="hidden" value={t.huella} />
                    <button className="min-h-[38px] cursor-pointer rounded-[10px] border border-line-panel-strong bg-bg-raised px-3.5 text-[14px] font-medium text-ink hover:border-gold max-[859px]:min-h-11" type="submit">
                      Ya está arreglado
                    </button>
                  </form>
                </div>
                <details className="group mt-3.5" open={n === 0}>
                  <summary className="cursor-pointer list-none text-[14px] text-gold-deep [&::-webkit-details-marker]:hidden">
                    <span className="group-open:hidden">▸ Qué significa y qué hacer</span>
                    <span className="hidden group-open:inline">▾ Qué significa y qué hacer</span>
                  </summary>
                  <div className="mt-3 grid gap-2.5 rounded-[10px] bg-bg px-4.5 py-4">
                    <div>
                      <div className="text-[12.5px] text-ink-mute">Qué significa</div>
                      <div className="text-[14.5px]">{e.pista ?? 'No es un fallo conocido. Abre el detalle técnico para ver la causa exacta.'}</div>
                    </div>
                    {t.ruta === null ? null : (
                      <div>
                        <div className="text-[12.5px] text-ink-mute">Dónde</div>
                        <div className="font-codigo text-[13px] break-all">{t.ruta}</div>
                      </div>
                    )}
                    <details>
                      <summary className="min-h-8 cursor-pointer text-[14px] text-gold-deep">Detalle técnico</summary>
                      <dl className="mt-2 grid gap-2 text-[12.5px] min-[640px]:grid-cols-[110px_minmax(0,1fr)]">
                        <dt className="text-ink-mute">Servicio</dt>
                        <dd className="m-0 font-codigo break-all">{t.servicio}</dd>
                        <dt className="text-ink-mute">Mensaje</dt>
                        <dd className="m-0 font-codigo break-all">{t.mensaje}</dd>
                        <dt className="text-ink-mute">Acción</dt>
                        <dd className="m-0 font-codigo break-all">{t.accion ?? '—'}</dd>
                      </dl>
                      <pre className="mt-2 max-h-96 overflow-auto rounded-[10px] bg-shell-deep p-4 font-codigo text-[12px] leading-relaxed whitespace-pre-wrap text-shell-ink">{t.detalle || 'Sin más detalle.'}</pre>
                    </details>
                  </div>
                </details>
              </li>
            )
          })}
        </ul>
        <p className="mt-5 text-[14px] text-ink-mute">Se guardan 30 días.</p>
        </>
      )}
    </>
  )
}
