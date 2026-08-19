import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { catalog } from '@/app/composition/container'
import { CollectionsCarousel } from '@/modules/catalog/ui/CollectionsCarousel'
import { ModelsSection } from '@/modules/catalog/ui/ModelsSection'
import { PricingSection } from '@/modules/catalog/ui/PricingSection'
import { SectionHeading } from '@/shared/design/ui/SectionHeading'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { parseLocaleParam } from '@/shared/i18n/server'
import { attempt, isOk } from '@/shared/result'
import { faqJsonLd, jsonLdScript, organizationJsonLd, productJsonLd } from '@/shared/seo/json-ld'
import { buildPageMetadata, truncateDescription } from '@/shared/seo/metadata'
import { ComparisonSection } from '@/sections/ComparisonSection'
import { ExperienceSection } from '@/sections/ExperienceSection'
import { FaqSection } from '@/sections/FaqSection'
import { HeroSection } from '@/sections/HeroSection'
import { MobileSection } from '@/sections/MobileSection'
import { TestimonialsSection } from '@/sections/TestimonialsSection'
import { ContactSection } from '@/modules/leads'
import { HeroCanvas } from '@/three/HeroCanvas'

// Rendered per request, not prerendered: the pages read Postgres and the image is
// built in CI/Docker where the database is unreachable. The queries are indexed and
// hit a database in the same compose network, so the cost is a couple of milliseconds.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params
  const locale = parseLocaleParam(raw)
  if (!locale) return {}

  const dictionary = getDictionary(locale)

  return buildPageMetadata({
    locale,
    path: `/${locale}`,
    title: dictionary.seo.homeTitle,
    description: truncateDescription(dictionary.seo.homeDescription),
  })
}

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = parseLocaleParam(raw)
  if (!locale) notFound()

  const dictionary = getDictionary(locale)

  // The proxy puts the CSP nonce on the request; without it these inline blocks would
  // be refused by the policy.
  const nonce = (await headers()).get('x-nonce') ?? undefined

  // The repositories throw when Postgres is unreachable, so each read is wrapped:
  // a database outage degrades the page section by section instead of returning a 500.
  const asOutage = (cause: unknown) => ({
    kind: 'not_found' as const,
    detail: cause instanceof Error ? cause.message : 'error desconocido',
  })

  const [plansResult, templatesResult, categoriesResult] = await Promise.all([
    attempt(() => catalog.listPlans(locale), asOutage),
    attempt(() => catalog.listTemplates(locale), asOutage),
    attempt(() => catalog.listCategories(locale), asOutage),
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
  const categories = isOk(categoriesResult) ? categoriesResult.value : []

  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationJsonLd()) }}
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
        dictionary={dictionary}
        slot={
          <HeroCanvas
            alt={dictionary.hero.posterAlt}
            closeLabel={dictionary.hero.envelopeClose}
            openLabel={dictionary.hero.envelopeOpen}
            posterSrc="/hero/envelope-poster.avif"
          />
        }
      />
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
              <p className="text-[13px] text-ink-mute">{dictionary.collections.hint}</p>
            </div>
            <div className="mt-14 flex justify-center">
              <CollectionsCarousel dictionary={dictionary} templates={templates} />
            </div>
          </div>
        </section>
      ) : null}

      <ComparisonSection dictionary={dictionary} />

      {plans.length > 0 ? <PricingSection dictionary={dictionary} locale={locale} plans={plans} /> : null}

      {templates.length > 0 ? <ModelsSection dictionary={dictionary} locale={locale} templates={templates} /> : null}

      <TestimonialsSection dictionary={dictionary} />
      <FaqSection dictionary={dictionary} />
      <ContactSection categories={categories} dictionary={dictionary} locale={locale} />
    </>
  )
}
