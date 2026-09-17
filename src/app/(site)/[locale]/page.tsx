import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { NONCE_HEADER } from '@/shared/config/headers'
import { notFound } from 'next/navigation'
import { site, webPublica } from '@/app/composition/container'
import { sitioPublico } from '@/modules/admin/domain/site-settings'
import { CollectionsCarousel } from '@/modules/catalog/ui/CollectionsCarousel'
import { ModelsSection } from '@/modules/catalog/ui/ModelsSection'
import { PricingSection } from '@/modules/catalog/ui/PricingSection'
import { comparativaDePlanes } from './fiesta-page'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { SectionHeading } from '@/shared/design/ui/SectionHeading'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { parseLocaleParam } from '@/shared/i18n/server'
import { attempt, isOk } from '@/shared/result'
import { faqJsonLd, jsonLdScript, organizationJsonLd, productJsonLd } from '@/shared/seo/json-ld'
import { buildPageMetadata, truncateDescription } from '@/shared/seo/metadata'
import { ComparisonSection } from '@/sections/ComparisonSection'
import { ExperienceSection } from '@/sections/ExperienceSection'
import { FaqSection } from '@/sections/FaqSection'
import { FiestaChooser } from '@/sections/FiestaChooser'
import { HeroSection } from '@/sections/HeroSection'
import { HeroStack } from '@/sections/HeroStack'
import { MobileSection } from '@/sections/MobileSection'
import { TestimonialsSection } from '@/sections/TestimonialsSection'
import { ContactSection } from '@/modules/leads'
import { aLaVenta } from '@/modules/catalog'
import { PrivacyNotice } from '@/sections/LegalPage'

// Rendered per request, not prerendered: the pages read Postgres and the image is
// built in CI/Docker where the database is unreachable. The queries are indexed and
// hit a database in the same compose network, so the cost is a couple of milliseconds.
export const dynamic = 'force-dynamic'

/** Las escenas de bodas, XV y despedidas, en el mismo orden que el diccionario. */
const ESCENAS = [
  '/site/colecciones/bodas-1.avif',
  '/site/colecciones/bodas-2.avif',
  '/site/colecciones/xv-1.avif',
  '/site/colecciones/xv-2.avif',
  '/site/colecciones/despedida-ella-1.avif',
  '/site/colecciones/despedida-ella-2.avif',
  '/site/colecciones/despedida-el-1.avif',
  '/site/colecciones/despedida-el-2.avif',
] as const

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params
  const locale = parseLocaleParam(raw)
  if (!locale) return {}

  const dictionary = getDictionary(locale)
  // El título y la descripción que escribió el admin en «La web»; vacíos, los de siempre.
  const seo = (await site.settings()).seo.inicio

  return buildPageMetadata({
    locale,
    path: `/${locale}`,
    title: seo.titulo[locale] || dictionary.seo.homeTitle,
    description: truncateDescription(seo.descripcion[locale] || dictionary.seo.homeDescription),
  })
}

export default async function LandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ modelo?: string }>
}) {
  const { locale: raw } = await params
  const { modelo } = await searchParams
  const locale = parseLocaleParam(raw)
  if (!locale) notFound()

  // El diseño con el que llega quien viene del escaparate, validado **aquí** contra el
  // registro: `themeFor` cae al clásico con una clave desconocida, y propagar esa caída
  // metería en el pedido un modelo que nadie eligió. Lo que no exista, no viaja.
  const temaElegido = modelo === undefined ? null : themeFor(modelo)
  const modeloElegido = temaElegido !== null && temaElegido.key === modelo ? temaElegido.key : null

  const dictionary = getDictionary(locale)

  // The proxy puts the CSP nonce on the request; without it these inline blocks would
  // be refused by the policy.
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined

  // The repositories throw when Postgres is unreachable, so each read is wrapped:
  // a database outage degrades the page section by section instead of returning a 500.
  const asOutage = (cause: unknown) => ({
    kind: 'not_found' as const,
    detail: cause instanceof Error ? cause.message : 'error desconocido',
  })

  const ajustes = await site.settings()
  const sitio = sitioPublico(ajustes, locale)

  const [plansResult, templatesResult, categoriesResult] = await Promise.all([
    attempt(() => webPublica.planes(locale), asOutage),
    attempt(() => webPublica.modelos(locale), asOutage),
    attempt(() => webPublica.categorias(locale), asOutage),
  ])

  if (!isOk(plansResult)) {
    console.error('No se pudieron cargar los planes de precios:', plansResult.error.detail)
  }
  if (!isOk(templatesResult)) {
    console.error('No se pudieron cargar las plantillas del catálogo:', templatesResult.error.detail)
  }
  if (!isOk(categoriesResult)) {
    console.error('No se pudieron cargar las categorías de evento:', categoriesResult.error.detail)
  }

  const plans = isOk(plansResult) ? plansResult.value : []
  const templates = isOk(templatesResult) ? templatesResult.value : []
  // El formulario solo ofrece lo que se vende: bodas y XV años.
  const categories = aLaVenta(isOk(categoriesResult) ? categoriesResult.value : [])

  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: jsonLdScript(
          organizationJsonLd({
            whatsapp: sitio.whatsapp,
            direccion: sitio.direccion,
            ciudad: sitio.ciudad,
            pais: sitio.pais,
            redes: [sitio.redes.instagram, sitio.redes.facebook, sitio.redes.tiktok],
          }),
        ) }}
        nonce={nonce}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{ __html: jsonLdScript(productJsonLd(plans, locale)) }}
        nonce={nonce}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(dictionary)) }}
        nonce={nonce}
        type="application/ld+json"
      />

      <HeroSection
        cifras={sitio.cifras}
        dictionary={dictionary}
        marcas={sitio.marcas}
        slot={
          // La composición de sobres, sin botón de «Abrir el sobre» (pedido por el usuario).
          <div className="relative h-[440px] w-full lg:h-[540px]">
            <HeroStack alt={dictionary.hero.posterAlt} />
          </div>
        }
      />
      <FiestaChooser dictionary={dictionary} locale={locale} />
      <ExperienceSection dictionary={dictionary} />
      <MobileSection dictionary={dictionary} />

      {templates.length > 0 ? (
        <section aria-labelledby="collections-title" className="px-6 py-24" id="colecciones">
          <div className="mx-auto max-w-[1180px]">
            <div className="flex flex-col items-center gap-4 text-center">
              <SectionHeading
                eyebrow={dictionary.collections.eyebrow}
                title={<span id="collections-title">{dictionary.collections.title}</span>}
              />
            </div>
            {/* El escenario ocupa el ancho entero: las flechas van a sus bordes, como en
                la maqueta, y no encima de la escena central. */}
            <div className="mt-14">
              <CollectionsCarousel
                dictionary={dictionary}
                slides={dictionary.collections.scenes.map((scene, i) => ({
                  key: `${scene.tag}-${scene.name}`,
                  tag: scene.tag,
                  name: scene.name,
                  alt: scene.alt,
                  src: ESCENAS[i] ?? ESCENAS[0]!,
                }))}
              />
            </div>
          </div>
        </section>
      ) : null}

      <ComparisonSection dictionary={dictionary} />

      {plans.length > 0 ? (
        <PricingSection
          comparativa={await comparativaDePlanes(plans, dictionary)}
          contacto={{ whatsapp: sitio.whatsapp, mensajePlan: sitio.mensajePlan }}
          dictionary={dictionary}
          locale={locale}
          modelo={modeloElegido}
          plans={plans}
        />
      ) : null}

      {templates.length > 0 ? <ModelsSection dictionary={dictionary} locale={locale} templates={templates} /> : null}

      <TestimonialsSection dictionary={dictionary} testimonios={sitio.testimonios} />
      <FaqSection dictionary={dictionary} />
      <ContactSection
        categories={categories}
        contacto={{
          whatsapp: sitio.whatsapp,
          whatsappVisible: sitio.whatsappVisible,
          horario: sitio.horario,
          mensaje: sitio.mensajeGeneral,
        }}
        dictionary={dictionary}
        locale={locale}
        privacidad={
          <PrivacyNotice
            enlace={dictionary.legal.noticeLink}
            href={sitio.privacidadPublicada ? `/${locale}/privacidad` : null}
            texto={dictionary.legal.notice}
          />
        }
      />
    </>
  )
}
