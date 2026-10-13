import { admin, asistente } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { AjustesDelAsistente } from '@/modules/asistente/ui/AjustesDelAsistente'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PestanasDeAdmin } from '@/modules/admin'
import { SelloDeLuxury } from '@/modules/asistente/ui/RobotLuxury'
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
      <PanelHeader title="Ajustes" tituloEnCelular="Asistente Luxury" pestanas={<PestanasDeAdmin />} />
      <div className="flex flex-wrap items-start gap-6">
        {/* Lo que lleva gastado (maqueta E45), con la copa de Luxury y la barra hasta el techo. */}
        <section aria-labelledby="luxury-este-mes" className="flex min-w-0 flex-[1_1_300px] flex-col gap-3 rounded-[16px] border border-grab-borde bg-bg-raised p-6 shadow-[inset_0_0_0_7px_var(--color-bg-raised),inset_0_0_0_8px_var(--color-grab-filete)]">
          <SelloDeLuxury size={56} />
          <h2 className="mt-2 font-display text-[24px] font-medium" id="luxury-este-mes">
            Luxury este mes
          </h2>
          <p className="font-display text-[34px] leading-none font-medium [font-variant-numeric:lining-nums]">
            {usd(uso.gastoMicroUsd)} <span className="font-sans text-[16px] font-normal text-ink-mute">de {config.presupuestoUsd}</span>
          </p>
          <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-line-panel">
            <span className="block h-full bg-gold" style={{ width: `${Math.min(100, (uso.gastoMicroUsd / Math.max(1, config.presupuestoUsd * 1_000_000)) * 100)}%` }} />
          </span>
          <p className="text-[14px] text-ink-mute">
            {uso.mensajes === 1 ? '1 mensaje' : `${uso.mensajes.toLocaleString('es-BO')} mensajes`} en {uso.eventos === 1 ? '1 evento' : `${uso.eventos} eventos`}. Al llegar al techo, Luxury se pausa hasta el mes siguiente.
          </p>
          {!asistente.disponible ? (
            <p className="rounded-[10px] bg-bg px-3.5 py-2.5 text-[13px] text-ink-soft" role="status">
              Luxury está apagado: falta <code className="font-codigo text-[12px]">OPENAI_API_KEY</code> en el entorno del servidor (Dokploy).
            </p>
          ) : null}
        </section>
        <section aria-label="Topes y planes" className="min-w-0 flex-[2_1_420px] rounded-[16px] border border-line-panel bg-bg-raised p-6">
          {isErr(planes) ? (
            <p className="text-[14px] text-danger" role="alert">
              No pudimos leer los planes. La base no responde; vuelve a intentarlo en un momento.
            </p>
          ) : (
            <AjustesDelAsistente config={config} urlDeSiri={`${env.SITE_URL.replace(/\/$/, '')}/panel/luxury/siri`} planes={planes.value.filter((p) => p.isActive).map((p) => ({ slug: p.slug, nombre: p.es?.name ?? p.slug }))} />
          )}
        </section>
      </div>
    </>
  )
}
