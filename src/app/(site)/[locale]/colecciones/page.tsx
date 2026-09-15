import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { NONCE_HEADER } from '@/shared/config/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { site, webPublica } from '@/app/composition/container'
import { enlaceWhatsapp, formatoWhatsapp } from '@/shared/whatsapp'
import { TemplateCard } from '@/modules/catalog/ui/TemplateCard'
import { FIESTAS, type Fiesta } from '@/modules/events'
import { plantillasDeFiesta } from '@/sections/FiestaLanding'
import { SectionHeading } from '@/shared/design/ui/SectionHeading'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { parseLocaleParam } from '@/shared/i18n/server'
import { attempt, isOk } from '@/shared/result'
import { breadcrumbJsonLd, jsonLdScript } from '@/shared/seo/json-ld'
import { buildAlternates, buildPageMetadata } from '@/shared/seo/metadata'

// Rendered per request, not prerendered: the pages read Postgres and the image is
// built in CI/Docker where the database is unreachable. The queries are indexed and
// hit a database in the same compose network, so the cost is a couple of milliseconds.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params
  const locale = parseLocaleParam(raw)
  if (!locale) return {}

  const dictionary = getDictionary(locale)
  // El título y la descripción que escribió el admin en «La web»; vacíos, los de siempre.
  const seo = (await site.settings()).seo.colecciones

  return buildPageMetadata({
    locale,
    path: `/${locale}/colecciones`,
    title: seo.titulo[locale] || dictionary.seo.collectionsTitle,
    description: seo.descripcion[locale] || dictionary.seo.collectionsDescription,
  })
}

/**
 * Cuántos modelos se enseñan de golpe.
 *
 * Dieciséis tarjetas de papel con su sombra y su rotación son dieciséis composiciones
 * pesadas en la primera pantalla, y en un teléfono con datos eso es la diferencia entre
 * ver el catálogo y cerrarlo. Ocho llenan dos filas en escritorio y cuatro en móvil.
 */
const POR_TANDA = 8

export default async function CollectionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ ver?: string; fiesta?: string }>
}) {
  const { locale: raw } = await params
  const locale = parseLocaleParam(raw)
  if (!locale) notFound()

  const dictionary = getDictionary(locale)
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined
  // Cuántas se enseñan va **en la URL** y no en `useState`: así el catálogo es enlazable,
  // sobrevive a recargar y a volver atrás desde una vista previa, y la página sigue siendo
  // de servidor. Es la misma regla que el resto del proyecto.
  const { ver, fiesta: fiestaPedida } = await searchParams
  // Bodas y XV no se mezclan: se ve una fiesta a la vez, y cuál va en la URL.
  const fiesta: Fiesta = fiestaPedida === 'xv' ? 'xv' : 'boda'
  const pedidas = Number.parseInt(ver ?? '', 10)
  const visibles = Number.isFinite(pedidas) && pedidas > 0 ? Math.min(pedidas, 200) : POR_TANDA
  // Same reason as the landing: a connection failure throws, and this page already has
  // a designed fallback for "no catalog" — it should be what the visitor sees.
  const templatesResult = await attempt(
    () => webPublica.modelos(locale),
    (cause) => ({ kind: 'not_found' as const, detail: cause instanceof Error ? cause.message : 'error desconocido' }),
  )

  if (!isOk(templatesResult)) {
    console.error('No se pudieron cargar las plantillas del catálogo:', templatesResult.error.detail)

    const ajustes = await site.settings()
    const whatsappHref = enlaceWhatsapp(ajustes.whatsapp, ajustes.mensajes.general[locale])

    return (
      <section className="px-6 py-24" id="modelos">
        <div className="mx-auto flex max-w-[520px] flex-col items-center gap-6 text-center">
          <SectionHeading eyebrow={dictionary.collections.eyebrow} title={dictionary.collections.title} />
          <p className="text-[14px] leading-[1.7] text-ink-soft">{dictionary.collections.errorMessage}</p>
          {whatsappHref === null ? null : (
            <a
              className="rounded-[var(--radius-pill)] bg-gold px-7 py-3.5 text-[12px] uppercase tracking-[var(--tracking-luxe)] text-bg-raised"
              href={whatsappHref}
              rel="noopener noreferrer"
              target="_blank"
            >
              {formatoWhatsapp(ajustes.whatsapp)}
            </a>
          )}
        </div>
      </section>
    )
  }

  const templates = plantillasDeFiesta(templatesResult.value, fiesta)
  const mostradas = templates.slice(0, visibles)
  const quedan = templates.length - mostradas.length
  const breadcrumb = breadcrumbJsonLd([
    { name: dictionary.seo.breadcrumbHome, url: buildAlternates(`/${locale}`).canonical },
    { name: dictionary.collections.title, url: buildAlternates(`/${locale}/colecciones`).canonical },
  ])

  return (
    <section className="px-6 py-24" id="modelos">
      <script dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumb) }} nonce={nonce} type="application/ld+json" />
      <div className="mx-auto max-w-[1240px]">
        <div className="flex flex-col items-center gap-4 text-center">
          <SectionHeading eyebrow={dictionary.collections.eyebrow} title={dictionary.collections.title} />
          <p className="max-w-[46ch] text-[15px] text-ink-soft">{dictionary.models.subtitle}</p>
        </div>

        <nav aria-label={dictionary.nav.collections} className="mt-10 flex justify-center gap-2">
          {FIESTAS.map((f) => (
            <Link
              aria-current={f === fiesta ? 'page' : undefined}
              className={`rounded-[var(--radius-pill)] border px-6 py-2.5 text-[12px] uppercase tracking-[var(--tracking-luxe)] transition-colors ${
                f === fiesta ? 'border-gold bg-gold text-bg-raised' : 'border-[var(--color-line)] text-ink-soft hover:border-gold'
              }`}
              href={f === 'boda' ? `/${locale}/colecciones#modelos` : `/${locale}/colecciones?fiesta=xv#modelos`}
              key={f}
              scroll={false}
            >
              {f === 'boda' ? dictionary.nav.weddings : dictionary.nav.quinceaneras}
            </Link>
          ))}
        </nav>

        <div className="mt-12 grid grid-cols-2 place-items-center gap-x-6 gap-y-14 md:grid-cols-4">
          {mostradas.map((template) => (
            <TemplateCard dictionary={dictionary} key={template.id} locale={locale} template={template} />
          ))}
        </div>

        {quedan > 0 ? (
          <div className="mt-16 flex flex-col items-center gap-3">
            <Link
              className="rounded-[var(--radius-pill)] border border-[var(--color-line)] px-9 py-3.5 text-[12px] uppercase tracking-[var(--tracking-luxe)] text-ink transition-colors hover:border-gold"
              href={`/${locale}/colecciones?${fiesta === 'xv' ? 'fiesta=xv&' : ''}ver=${visibles + POR_TANDA}#modelos`}
              scroll={false}
            >
              {dictionary.collections.loadMore}
            </Link>
            <p className="font-mono text-[11px] tracking-[0.18em] text-ink-mute">
              {mostradas.length} / {templates.length}
            </p>
          </div>
        ) : null}

        <div className="mt-16 flex justify-center">
          <Link
            className="text-[12px] uppercase tracking-[var(--tracking-luxe)] text-ink-soft underline-offset-4 transition-colors hover:text-gold"
            href={`/${locale}`}
          >
            {dictionary.collections.backToHome}
          </Link>
        </div>
      </div>
    </section>
  )
}
