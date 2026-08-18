import { notFound } from 'next/navigation'
import { catalog } from '@/app/composition/container'
import { CollectionsCarousel } from '@/modules/catalog/ui/CollectionsCarousel'
import { ModelsSection } from '@/modules/catalog/ui/ModelsSection'
import { PricingSection } from '@/modules/catalog/ui/PricingSection'
import { SectionHeading } from '@/shared/design/ui/SectionHeading'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { parseLocaleParam } from '@/shared/i18n/server'
import { isOk } from '@/shared/result'
import { ComparisonSection } from '@/sections/ComparisonSection'
import { ExperienceSection } from '@/sections/ExperienceSection'
import { FaqSection } from '@/sections/FaqSection'
import { HeroSection } from '@/sections/HeroSection'
import { MobileSection } from '@/sections/MobileSection'
import { StatsStrip } from '@/sections/StatsStrip'
import { TestimonialsSection } from '@/sections/TestimonialsSection'
import { HeroCanvas } from '@/three/HeroCanvas'

export const revalidate = 300

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = parseLocaleParam(raw)
  if (!locale) notFound()

  const dictionary = getDictionary(locale)

  const [plansResult, templatesResult] = await Promise.all([catalog.listPlans(locale), catalog.listTemplates(locale)])

  if (!isOk(plansResult)) {
    console.error('No se pudieron cargar los planes de precios:', plansResult.error.detail)
  }
  if (!isOk(templatesResult)) {
    console.error('No se pudieron cargar las plantillas del catálogo:', templatesResult.error.detail)
  }

  const plans = isOk(plansResult) ? plansResult.value : []
  const templates = isOk(templatesResult) ? templatesResult.value : []

  return (
    <>
      <HeroSection
        dictionary={dictionary}
        slot={<HeroCanvas alt={dictionary.hero.posterAlt} posterSrc="/hero/envelope-poster.avif" />}
      />
      <StatsStrip dictionary={dictionary} />
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
    </>
  )
}
