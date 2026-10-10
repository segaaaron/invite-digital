import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { extrasParaPedido, site, webPublica } from '@/app/composition/container'
import { reservasDePlanes } from '../../fiesta-page'
import { PrivacyNotice } from '@/sections/LegalPage'
import { formatMoney } from '@/modules/catalog/domain/money'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { fiestaDeCategoria } from '@/modules/events'
import { OrderForm, type ModeloDelPedido } from '@/modules/orders/ui/OrderForm'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { parseLocaleParam } from '@/shared/i18n/server'
import { isErr } from '@/shared/result'

export const dynamic = 'force-dynamic'

/** El título de la pestaña (y de lo que se comparte): sin él salía la dirección en crudo. No se indexa: es un formulario. */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = parseLocaleParam((await params).locale)
  if (!locale) return {}
  return { title: `${getDictionary(locale).orders.orderTitle} | Luxury Atelier`, robots: { index: false, follow: false } }
}

/**
 * El alta de pedido. Un plan que no existe es **404**: enseñar el formulario para un plan
 * inventado dejaría pedidos apuntando a nada.
 */
/** Nombre interno anterior → el de hoy. */
const NOMBRES_VIEJOS: Record<string, string> = { 'firma-3d': 'gala', 'alta-costura': 'imperial' }

export default async function PedidoPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; plan: string }>
  searchParams: Promise<{ modelo?: string; ref?: string }>
}) {
  const { locale: raw, plan: planSlug } = await params
  const { modelo, ref } = await searchParams
  const locale = parseLocaleParam(raw)
  if (!locale) notFound()
  // Los planes se llamaban por dentro `firma-3d` y `alta-costura` (`0093`): los enlaces ya repartidos
  // llevan a su nombre de hoy, con lo que traigan detrás (el modelo elegido, la referencia).
  const nombreDeHoy = NOMBRES_VIEJOS[planSlug]
  if (nombreDeHoy !== undefined) {
    const q = new URLSearchParams(Object.entries({ modelo, ref }).filter((e): e is [string, string] => e[1] !== undefined))
    permanentRedirect(`/${locale}/pedido/${nombreDeHoy}${q.size > 0 ? `?${q.toString()}` : ''}`)
  }

  // El diseño que traiga la URL se valida **aquí**, contra el registro de temas: quien
  // sabe qué diseños existen vive en `events/ui`, y el módulo de pedidos no puede
  // importarlo. Una clave inventada se descarta en silencio —el pedido sigue— porque
  // `themeFor` cae al clásico y eso delataría un modelo que nadie eligió.
  const tema = modelo === undefined ? null : themeFor(modelo)
  const disenoElegido = tema !== null && tema.key === modelo ? tema : null

  const dictionary = getDictionary(locale)
  const planes = await webPublica.planes(locale)
  if (isErr(planes)) throw new Error(planes.error.detail)

  // Durante los segundos de un despliegue la web nueva arranca antes que la migración `0093`: el plan puede
  // llamarse todavía como antes. Se busca también por ese nombre, para que `/pedido/gala` no dé 404.
  const nombreAnterior = Object.entries(NOMBRES_VIEJOS).find(([, hoy]) => hoy === planSlug)?.[0]
  const plan = planes.value.find((p) => p.slug === planSlug) ?? planes.value.find((p) => p.slug === nombreAnterior)
  if (plan === undefined) notFound()

  // El pedido completo (9 oct): los modelos que se venden, por fiesta; los adicionales que este plan
  // puede llevar, con qué hace cada uno; la reserva, para el resumen; y los términos si están publicados.
  const [modelosLeidos, extras, reservas, sitio] = await Promise.all([webPublica.modelos(locale), extrasParaPedido(plan.slug), reservasDePlanes(), site.settings()])
  // Bodas y XV, las fiestas que se venden (`fiestaDeCategoria`, la regla de todo el proyecto).
  const enVenta = (isErr(modelosLeidos) ? [] : modelosLeidos.value).flatMap((t): ModeloDelPedido[] => {
    const fiesta = fiestaDeCategoria(t.categorySlug)
    return fiesta === 'boda' || fiesta === 'xv' ? [{ key: t.slug, label: t.name, fiesta }] : []
  })
  // Un modelo elegido en el escaparate que no es de esas dos (un cumpleaños, el día que se publique) no se
  // pierde: el formulario lo lleva como hasta ahora, sin pedir boda o XV.
  const modelos = disenoElegido !== null && !enVenta.some((m) => m.key === disenoElegido.key) ? [] : enVenta
  const filaDelPlan = (await webPublica.planesActivos().catch(() => null))
  const reservaPct = filaDelPlan === null || !filaDelPlan.ok ? null : (filaDelPlan.value.find((f) => f.slug === plan.slug)?.depositPct ?? null)
  const descripciones = dictionary.pricing.comparison.extrasDescripcion

  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-7 px-6 pt-32 pb-16">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-[34px] leading-tight font-light text-ink">{dictionary.orders.orderTitle}</h1>
        <p className="text-[14px] leading-[1.75] text-ink-soft">{dictionary.orders.orderIntro}</p>
      </header>

      <OrderForm
        referido={ref === undefined ? null : ref.slice(0, 16)}
        whatsapp={sitio.whatsapp || null}
        priceCents={plan.price.cents}
        reservaCents={reservas[plan.slug] ?? null}
        reservaPct={reservaPct}
        modelos={modelos}
        extras={extras.map((x) => ({ slug: x.slug, name: x.name, descripcion: descripciones[x.effect] ?? null, cents: x.priceCents }))}
        terminosHref={sitio.legal.terminos.publicada ? `/${locale}/terminos` : null}
        locale={locale}
        textos={dictionary.orders.form}
        planName={plan.name}
        planSlug={plan.slug}
        priceLabel={formatMoney(plan.price, locale)}
        templateName={disenoElegido?.label ?? null}
        templateSlug={disenoElegido?.key ?? null}
      />
      <PrivacyNotice
        enlace={dictionary.legal.noticeLink}
        href={sitio.legal.privacidad.publicada ? `/${locale}/privacidad` : null}
        texto={dictionary.legal.notice}
      />
    </main>
  )
}
