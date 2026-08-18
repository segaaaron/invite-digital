import { notFound } from 'next/navigation'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { parseLocaleParam } from '@/shared/i18n/server'

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = parseLocaleParam(raw)
  if (!locale) notFound()

  const dictionary = getDictionary(locale)

  return (
    <div className="mx-auto max-w-[1180px] px-6 pt-[180px]">
      <h1 className="font-display text-[clamp(40px,8vw,96px)] font-light leading-[0.95]">
        {dictionary.hero.titleLine1}
      </h1>
    </div>
  )
}
