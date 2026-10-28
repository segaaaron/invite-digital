import { admin } from '@/app/composition/container'
import { PlanEditor } from '@/modules/admin/ui/PlanEditor'
import { requireAdmin } from '@/app/_acciones/sesion'
import { formatAmount } from '@/shared/money'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PestanasDeAdmin } from '@/modules/admin'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { Pill } from '@/shared/design/ui/panel/PanelKit'
import { CheckIcon } from '@/shared/design/ui/icons'
import { isErr } from '@/shared/result'
import { tr } from '@/shared/i18n/idioma-servidor'

export async function generateMetadata() {
  const t = await tr()
  return { title: t('Planes · Administración', 'Plans · Administration') }
}
export const dynamic = 'force-dynamic'

/** `69000` → `690`; `145050` → `1450,50`. Lo que `parseAmount` vuelve a leer igual. */
const aCampo = (cents: number) => (cents % 100 === 0 ? String(cents / 100) : `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}`)

/**
 * Los planes que vende la web, editables sin desplegar.
 *
 * Los límites ya vivían en la base «para no exigir un despliegue», pero sin esta pantalla
 * cambiarlos exigía SQL, que es peor. Y el seed ya no los pisa en cada despliegue.
 */
export default async function AdminPlanesPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const t = await tr()
  await requireAdmin()
  const [planes, { plan: pedido }] = await Promise.all([admin.plans(), searchParams])

  return (
    <>
      <PanelHeader title={t('Planes', 'Plans')} meta={t('Precio y límites de cada plan. Los cambios valen para las ventas nuevas.', 'Price and limits of each plan. Changes apply to new sales.')} pestanas={<PestanasDeAdmin />} />

      {isErr(planes) ? (
        <PanelCard>
          <p className="text-[13px] text-danger" role="alert">
            {t('No pudimos leer los planes. La base no responde; vuelve a intentarlo en un momento.', 'We could not read the plans. The database is not responding; try again in a moment.')}
          </p>
        </PanelCard>
      ) : (
        (() => {
          // Las tres tarjetas de la maqueta (E16) y, debajo, el editor del elegido (`?plan=`): por defecto, el destacado.
          const elegido = planes.value.find((pl) => pl.slug === pedido) ?? planes.value.find((pl) => pl.highlighted) ?? planes.value[0]
          return (
            <div className="flex flex-col gap-7">
              <div className="flex flex-wrap gap-4.5">
                {planes.value.map((plan) => {
                  const activo = plan.slug === elegido?.slug
                  const rasgos = [
                    plan.maxGuestGroups === null ? t('Sin límite de invitaciones', 'Unlimited invitations') : t(`Hasta ${plan.maxGuestGroups} invitaciones`, `Up to ${plan.maxGuestGroups} invitations`),
                    plan.maxGalleryPhotos === null ? t('Fotos sin límite', 'Unlimited photos') : t(`${plan.maxGalleryPhotos} fotos`, `${plan.maxGalleryPhotos} photos`),
                    plan.correctionRounds === null ? null : t(`${plan.correctionRounds} rondas de diseño`, `${plan.correctionRounds} design rounds`),
                    t(`${plan.onlineDays} días en línea`, `${plan.onlineDays} days online`),
                  ].filter((x): x is string => x !== null)
                  return (
                    <a
                      aria-current={activo ? 'true' : undefined}
                      className={`flex min-w-0 flex-[1_1_220px] flex-col rounded-[16px] bg-bg-raised p-5.5 text-ink no-underline transition-colors ${activo ? 'border-[1.5px] border-shell-deep' : 'border border-line-panel hover:border-gold'} ${plan.isActive ? '' : 'opacity-60'}`}
                      href={`/dashboard/admin/plans?plan=${plan.slug}`}
                      key={plan.slug}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-display text-[24px] font-medium">{plan.es?.name ?? plan.slug}</span>
                        {activo ? <Pill tone="maybe">{t('Editando', 'Editing')}</Pill> : plan.isActive ? null : <Pill tone="neutro">{t('Sin vender', 'Not for sale')}</Pill>}
                      </span>
                      <span className="mt-1.5 mb-2.5 font-display text-[34px] font-medium">{formatAmount(plan.priceCents, plan.currency).replace(/,00$/, '')}</span>
                      <ul>
                        {rasgos.map((r) => (
                          <li className="flex gap-2.5 py-1.5 text-[14px]" key={r}>
                            <CheckIcon className="mt-0.5 size-4 shrink-0 text-pill-ok-ink" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </a>
                  )
                })}
              </div>
              {elegido === undefined ? null : (
                <PanelCard key={elegido.slug}>
              <PlanEditor
                plan={{
                  slug: elegido.slug,
                  price: aCampo(elegido.priceCents),
                  priceLabel: formatAmount(elegido.priceCents, elegido.currency),
                  priceBefore: elegido.priceBeforeCents == null ? '' : aCampo(elegido.priceBeforeCents),
                  maxGuestGroups: elegido.maxGuestGroups,
                  maxDoorPorters: elegido.maxDoorPorters,
                  maxCohosts: elegido.maxCohosts,
                  maxHiredPlanners: elegido.maxHiredPlanners,
                  maxGalleryPhotos: elegido.maxGalleryPhotos,
                  guestPhotos: elegido.guestPhotos,
                  eventPassword: elegido.eventPassword,
                  csvImport: elegido.csvImport,
                  onlineDays: elegido.onlineDays,
                  designChange: elegido.designChange,
                  plannerSuite: elegido.plannerSuite,
                  depositPct: elegido.depositPct,
                  depositFixed: elegido.depositFixedCents === null ? '' : aCampo(elegido.depositFixedCents),
                  priceUsd: elegido.priceUsdCents === null ? '' : aCampo(elegido.priceUsdCents),
                  correctionRounds: elegido.correctionRounds === null ? '' : String(elegido.correctionRounds),
                  deliveryDays: elegido.deliveryDays === null ? '' : String(elegido.deliveryDays),
                  includesSeating: elegido.includesSeating,
                  includesRegistry: elegido.includesRegistry,
                  includesCheckin: elegido.includesCheckin,
                  includesGuestbook: elegido.includesGuestbook,
                  includesGiftWays: elegido.includesGiftWays,
                  includesStyle: elegido.includesStyle,
                  highlighted: elegido.highlighted,
                  isActive: elegido.isActive,
                  eventos: elegido.eventos,
                  es: elegido.es,
                  en: elegido.en,
                }}
              />
                </PanelCard>
              )}
            </div>
          )
        })()
      )}
    </>
  )
}
