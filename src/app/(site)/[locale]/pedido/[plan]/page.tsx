import { notFound } from 'next/navigation'
import { catalog } from '@/app/composition/container'
import { formatMoney } from '@/modules/catalog/domain/money'
import { OrderForm } from '@/modules/orders/ui/OrderForm'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { parseLocaleParam } from '@/shared/i18n/server'
import { isErr } from '@/shared/result'

export const dynamic = 'force-dynamic'

/**
 * El alta de pedido. Un plan que no existe es **404**: enseñar el formulario para un plan
 * inventado dejaría pedidos apuntando a nada.
 */
export default async function PedidoPage({ params }: { params: Promise<{ locale: string; plan: string }> }) {
  const { locale: raw, plan: planSlug } = await params
  const locale = parseLocaleParam(raw)
  if (!locale) notFound()

  const dictionary = getDictionary(locale)
  const planes = await catalog.listPlans(locale)
  if (isErr(planes)) throw new Error(planes.error.detail)

  const plan = planes.value.find((p) => p.slug === planSlug)
  if (plan === undefined) notFound()

  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-7 px-6 py-16">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-[34px] leading-tight font-light text-ink">{dictionary.orders.orderTitle}</h1>
        <p className="text-[14px] leading-[1.75] text-ink-soft">{dictionary.orders.orderIntro}</p>
      </header>

      <OrderForm planName={plan.name} planSlug={plan.slug} priceLabel={`${formatMoney(plan.price, locale)} ${plan.price.currency}`} />
    </main>
  )
}
