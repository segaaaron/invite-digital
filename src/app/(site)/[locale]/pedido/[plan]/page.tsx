import { notFound } from 'next/navigation'
import { catalog, site } from '@/app/composition/container'
import { PrivacyNotice } from '@/sections/LegalPage'
import { formatMoney } from '@/modules/catalog/domain/money'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { OrderForm } from '@/modules/orders/ui/OrderForm'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { parseLocaleParam } from '@/shared/i18n/server'
import { isErr } from '@/shared/result'

export const dynamic = 'force-dynamic'

/**
 * El alta de pedido. Un plan que no existe es **404**: enseñar el formulario para un plan
 * inventado dejaría pedidos apuntando a nada.
 */
export default async function PedidoPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; plan: string }>
  searchParams: Promise<{ modelo?: string }>
}) {
  const { locale: raw, plan: planSlug } = await params
  const { modelo } = await searchParams
  const locale = parseLocaleParam(raw)
  if (!locale) notFound()

  // El diseño que traiga la URL se valida **aquí**, contra el registro de temas: quien
  // sabe qué diseños existen vive en `events/ui`, y el módulo de pedidos no puede
  // importarlo. Una clave inventada se descarta en silencio —el pedido sigue— porque
  // `themeFor` cae al clásico y eso delataría un modelo que nadie eligió.
  const tema = modelo === undefined ? null : themeFor(modelo)
  const disenoElegido = tema !== null && tema.key === modelo ? tema : null

  const dictionary = getDictionary(locale)
  const planes = await catalog.listPlans(locale)
  if (isErr(planes)) throw new Error(planes.error.detail)

  const plan = planes.value.find((p) => p.slug === planSlug)
  if (plan === undefined) notFound()

  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-7 px-6 pt-32 pb-16">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-[34px] leading-tight font-light text-ink">{dictionary.orders.orderTitle}</h1>
        <p className="text-[14px] leading-[1.75] text-ink-soft">{dictionary.orders.orderIntro}</p>
      </header>

      <OrderForm
        planName={plan.name}
        planSlug={plan.slug}
        priceLabel={`${formatMoney(plan.price, locale)} ${plan.price.currency}`}
        templateName={disenoElegido?.label ?? null}
        templateSlug={disenoElegido?.key ?? null}
      />
      <PrivacyNotice
        enlace={dictionary.legal.noticeLink}
        href={(await site.settings()).legal.privacidad.publicada ? `/${locale}/privacidad` : null}
        texto={dictionary.legal.notice}
      />
    </main>
  )
}
