import { admin } from '@/app/composition/container'
import { PlanEditor } from '@/modules/admin/ui/PlanEditor'
import { requireAdmin } from '@/modules/identity/session-cookie'
import { formatAmount } from '@/modules/registry'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Planes · Administración' }
export const dynamic = 'force-dynamic'

/** `69000` → `690`; `145050` → `1450,50`. Lo que `parseAmount` vuelve a leer igual. */
const aCampo = (cents: number) => (cents % 100 === 0 ? String(cents / 100) : `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}`)

/**
 * Los planes que vende la web, editables sin desplegar.
 *
 * Los límites ya vivían en la base «para no exigir un despliegue», pero sin esta pantalla
 * cambiarlos exigía SQL, que es peor. Y el seed ya no los pisa en cada despliegue.
 */
export default async function AdminPlanesPage() {
  await requireAdmin()
  const planes = await admin.plans()

  return (
    <>
      <PanelHeader kicker="Administración" meta="Precio, tope, funciones y textos de lo que vende la web" title="Planes" />

      {isErr(planes) ? (
        <PanelCard>
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer los planes. La base no responde; vuelve a intentarlo en un momento.
          </p>
        </PanelCard>
      ) : (
        <div className="flex flex-col gap-4.5">
          {planes.value.map((plan) => (
            <PanelCard key={plan.slug} className={plan.highlighted ? 'border-gold/50' : ''}>
              <PlanEditor
                plan={{
                  slug: plan.slug,
                  price: aCampo(plan.priceCents),
                  priceLabel: formatAmount(plan.priceCents, plan.currency),
                  maxGuestGroups: plan.maxGuestGroups,
                  includesSeating: plan.includesSeating,
                  includesRegistry: plan.includesRegistry,
                  includesCheckin: plan.includesCheckin,
                  highlighted: plan.highlighted,
                  isActive: plan.isActive,
                  eventos: plan.eventos,
                  es: plan.es,
                  en: plan.en,
                }}
              />
            </PanelCard>
          ))}
        </div>
      )}
    </>
  )
}
