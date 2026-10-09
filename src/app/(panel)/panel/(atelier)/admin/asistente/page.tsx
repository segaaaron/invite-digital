import { admin, asistente } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { AjustesDelAsistente } from '@/modules/asistente/ui/AjustesDelAsistente'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { isErr } from '@/shared/result'
import { env } from '@/shared/config/env'

export const metadata = { title: 'Asistente · Administración' }
export const dynamic = 'force-dynamic'

const usd = (micro: number) => new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(micro / 1_000_000)

/** Ajustes › Asistente: Luxury, qué planes lo traen, sus topes y lo que lleva gastado este mes. */
export default async function AsistentePage() {
  await requireAdmin()
  const ahora = new Date()
  const [config, planes, uso] = await Promise.all([asistente.config(), admin.plans(), asistente.resumenDelMes(ahora)])
  return (
    <>
      <PanelHeader kicker="Ajustes" meta="Luxury, el planner con IA del panel del evento (OpenAI, gpt-6-luna)" title="Asistente" />
      <div className="flex flex-col gap-4.5">
        <PanelCard>
          {!asistente.disponible ? (
            <p className="mb-4 rounded-[12px] bg-bg-top px-3.5 py-2.5 text-[12.5px] text-ink-soft" role="status">
              Luxury está apagado: falta <code className="font-codigo text-[11.5px]">OPENAI_API_KEY</code> en el entorno del servidor (Dokploy).
            </p>
          ) : null}
          <dl className="grid gap-4 min-[560px]:grid-cols-3">
            <div>
              <dt className="text-[12px] text-ink-mute">Gastado este mes</dt>
              <dd className="font-display text-[28px] lining-nums">
                {usd(uso.gastoMicroUsd)} <span className="text-[14px] text-ink-mute">de {usd(config.presupuestoUsd * 1_000_000)}</span>
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-ink-mute">Mensajes este mes</dt>
              <dd className="font-display text-[28px] lining-nums">{uso.mensajes}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-ink-mute">Eventos que lo usaron</dt>
              <dd className="font-display text-[28px] lining-nums">{uso.eventos}</dd>
            </div>
          </dl>
        </PanelCard>
        <PanelCard>
          {isErr(planes) ? (
            <p className="text-[13px] text-danger" role="alert">
              No pudimos leer los planes. La base no responde; vuelve a intentarlo en un momento.
            </p>
          ) : (
            <AjustesDelAsistente config={config} urlDeSiri={`${env.SITE_URL.replace(/\/$/, '')}/panel/luxury/siri`} planes={planes.value.filter((p) => p.isActive).map((p) => ({ slug: p.slug, nombre: p.es?.name ?? p.slug }))} />
          )}
        </PanelCard>
      </div>
    </>
  )
}
