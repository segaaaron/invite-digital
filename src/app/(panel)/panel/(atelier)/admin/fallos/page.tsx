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
import { idiomaDeLaPeticion, tr } from '@/shared/i18n/idioma-servidor'
import { traducir } from '@/shared/i18n/en-ingles'

export async function generateMetadata() {
  const t = await tr()
  return { title: t('Registro de fallos · Administración', 'Error log · Administration') }
}
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
 * van plegados en «Ver detalle técnico». «Ya está arreglado» lo borra. {t('Se guardan 30 días.', 'Kept for 30 days.')}
 */
export default async function FallosPage({ searchParams }: { searchParams: Promise<{ dias?: string; origen?: string }> }) {
  const t = await tr()
  const locale = await idiomaDeLaPeticion()
  await requireAdmin()
  const p = await searchParams
  const dias = PERIODOS.find((x) => String(x.dias) === p.dias)?.dias ?? 7
  const origen = p.origen === 'servidor' || p.origen === 'navegador' ? p.origen : null
  const tipos = await tiposDeFallo(dias, origen)
  const total = tipos.reduce((suma, x) => suma + x.veces, 0)
  const ahora = new Date()
  const enlace = (d: number, o: string | null) => `/panel/admin/fallos?dias=${d}${o === null ? '' : `&origen=${o}`}`

  return (
    <>
      <PanelHeader title={t('Registro de fallos', 'Error log')} bajoPestanas={t('Solo lo que se rompió, dicho en palabras. Cuando lo arregles, bórralo: si vuelve a pasar, aparece otra vez.', 'Only what broke, said in plain words. When you fix it, delete it: if it happens again, it shows up again.')} pestanas={<PestanasDeAdmin />} />
      <div className="mb-6 flex flex-wrap items-center gap-2.5">
        {PERIODOS.map((x) => (
          <Link
            aria-current={x.dias === dias ? 'page' : undefined}
            className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-[13.5px] font-medium no-underline max-[859px]:min-h-11 ${x.dias === dias ? 'border-shell-deep bg-shell-deep text-shell-ink' : 'border-line-panel-strong bg-bg-raised text-ink hover:border-gold'}`}
            href={enlace(x.dias, origen)}
            key={x.dias}
          >
            {traducir(x.rotulo, t)}
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
            {traducir(x.rotulo, t)}
          </Link>
        ))}
        <span className="ml-auto text-[13.5px] text-ink-mute">{t(
          `${tipos.length} ${tipos.length === 1 ? 'fallo distinto' : 'fallos distintos'} · ${total} ${total === 1 ? 'vez' : 'veces'} en total`,
          `${tipos.length} ${tipos.length === 1 ? 'distinct error' : 'distinct errors'} · ${total} ${total === 1 ? 'time' : 'times'} in total`,
        )}</span>
      </div>

      {tipos.length === 0 ? (
        <PanelCard>
          <EmptyState description={t('Cuando un servicio falle, aquí verás cuál, cuántas veces y la causa exacta.', 'When a service fails, you will see here which one, how many times and the exact cause.')} icon={<CheckIcon />} title={t('Sin fallos en este periodo', 'No errors in this period')} />
        </PanelCard>
      ) : (
        <>
        <ul className="flex flex-col gap-3.5">
          {tipos.map((f, n) => {
            const e = explicarFallo(f, t)
            // Los fallos del navegador traen su agente en la primera línea (la voz de Luxury): «iPhone · Safari».
            const agente = f.origen === 'navegador' ? (f.detalle.split('\n')[0] ?? '') : ''
            const aparato = agente.startsWith('Mozilla/') ? describirDispositivo(agente) : null
            return (
              // La tarjeta de la maqueta (E06): el aviso, qué pasó y dónde, cuántas veces, y «Ya está arreglado» a la vista.
              <li className="rounded-[16px] border border-line-panel bg-bg-raised px-5.5 py-5" key={f.huella}>
                <div className="flex flex-wrap items-start gap-3.5">
                  <svg aria-hidden className="mt-0.5 size-5 shrink-0 text-danger" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M12 4 3 20h18L12 4zM12 10v4M12 17h.01" />
                  </svg>
                  <div className="min-w-0 flex-[1_1_300px]">
                    <p className="font-medium">{e.titulo}</p>
                    <p className="text-[13.5px] text-ink-mute">
                      {f.origen === 'navegador' ? t(`En el navegador${aparato === null ? '' : `, ${aparato}`}`, `In the browser${aparato === null ? '' : `, ${aparato}`}`) : t('En el servidor', 'On the server')}.{' '}
                      {t(`En ${e.donde}. Pasó ${f.veces === 1 ? '1 vez' : `${f.veces} veces`}, la última ${hace(f.ultimo, ahora, locale)}`, `In ${e.donde}. It happened ${f.veces === 1 ? 'once' : `${f.veces} times`}, the last ${hace(f.ultimo, ahora, locale)}`)}
                      {f.veces > 1 ? t(` (la primera ${hace(f.primero, ahora, locale)})`, ` (the first ${hace(f.primero, ahora, locale)})`) : ''}.
                    </p>
                  </div>
                  <form action={borrarTipoDeFalloAction}>
                    <input name="huella" type="hidden" value={f.huella} />
                    <button className="min-h-[38px] cursor-pointer rounded-[10px] border border-line-panel-strong bg-bg-raised px-3.5 text-[14px] font-medium text-ink hover:border-gold max-[859px]:min-h-11" type="submit">
                      {t('Ya está arreglado', 'It is fixed')}
                    </button>
                  </form>
                </div>
                <details className="group mt-3.5" open={n === 0}>
                  <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-[14px] text-gold-deep [&::-webkit-details-marker]:hidden">
                    <span className="group-open:hidden">{t('▸ Qué significa y qué hacer', '▸ What it means and what to do')}</span>
                    <span className="hidden group-open:inline">{t('▾ Qué significa y qué hacer', '▾ What it means and what to do')}</span>
                  </summary>
                  <div className="mt-3 grid gap-2.5 rounded-[10px] bg-bg px-4.5 py-4">
                    <div>
                      <div className="text-[12.5px] text-ink-mute">{t('Qué significa', 'What it means')}</div>
                      <div className="text-[14.5px]">{e.pista ?? t('Todavía no tenemos una explicación en palabras para este caso. En «Detalle técnico» está el mensaje exacto y dónde pasó: con eso se encuentra.', 'We don’t have a plain-words explanation for this case yet. «Technical detail» has the exact message and where it happened: that’s how to find it.')}</div>
                    </div>
                    {f.ruta === null ? null : (
                      <div>
                        <div className="text-[12.5px] text-ink-mute">{t('Dónde', 'Where')}</div>
                        <div className="font-codigo text-[13px] break-all">{f.ruta}</div>
                      </div>
                    )}
                    <details>
                      <summary className="flex min-h-11 cursor-pointer items-center text-[14px] text-gold-deep">{t('Detalle técnico', 'Technical detail')}</summary>
                      <dl className="mt-2 grid gap-2 text-[12.5px] min-[640px]:grid-cols-[110px_minmax(0,1fr)]">
                        <dt className="text-ink-mute">{t('Servicio', 'Service')}</dt>
                        <dd className="m-0 font-codigo break-all">{f.servicio}</dd>
                        <dt className="text-ink-mute">{t('Mensaje', 'Message')}</dt>
                        <dd className="m-0 font-codigo break-all">{f.mensaje}</dd>
                        <dt className="text-ink-mute">{t('Acción', 'Action')}</dt>
                        <dd className="m-0 font-codigo break-all">{f.accion ?? '—'}</dd>
                      </dl>
                      <pre className="mt-2 max-h-96 overflow-auto rounded-[10px] bg-shell-deep p-4 font-codigo text-[12px] leading-relaxed whitespace-pre-wrap text-shell-ink">{f.detalle || t('Sin más detalle.', 'No further detail.')}</pre>
                    </details>
                  </div>
                </details>
              </li>
            )
          })}
        </ul>
        <p className="mt-5 text-[14px] text-ink-mute">{t('Se guardan 30 días.', 'Kept for 30 days.')}</p>
        </>
      )}
    </>
  )
}
