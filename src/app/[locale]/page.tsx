import { notFound } from 'next/navigation'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { parseLocaleParam } from '@/shared/i18n/server'
import { HeroSection } from '@/sections/HeroSection'
import { StatsStrip } from '@/sections/StatsStrip'
import { ExperienceSection } from '@/sections/ExperienceSection'
import { MobileSection } from '@/sections/MobileSection'
import { ComparisonSection } from '@/sections/ComparisonSection'
import { TestimonialsSection } from '@/sections/TestimonialsSection'
import { FaqSection } from '@/sections/FaqSection'

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = parseLocaleParam(raw)
  if (!locale) notFound()

  const dictionary = getDictionary(locale)

  return (
    <>
      <HeroSection dictionary={dictionary} />
      <StatsStrip dictionary={dictionary} />
      <ExperienceSection dictionary={dictionary} />
      <MobileSection dictionary={dictionary} />
      <ComparisonSection dictionary={dictionary} />
      <TestimonialsSection dictionary={dictionary} />
      <FaqSection dictionary={dictionary} />
    </>
  )
}
