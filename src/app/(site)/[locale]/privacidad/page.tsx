import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { site } from '@/app/composition/container'
import { LegalPage } from '@/sections/LegalPage'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { parseLocaleParam } from '@/shared/i18n/server'
import { buildPageMetadata } from '@/shared/seo/metadata'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = parseLocaleParam((await params).locale)
  if (!locale) return {}
  const dictionary = getDictionary(locale)
  return buildPageMetadata({ locale, path: `/${locale}/privacidad`, title: dictionary.legal.privacyTitle, description: dictionary.legal.privacyTitle })
}

/** La política de privacidad que escribe el admin en «La web». Sin publicar, 404. */
export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = parseLocaleParam((await params).locale)
  if (!locale) notFound()
  const texto = (await site.settings()).legal.privacidad
  if (!texto.publicada) notFound()
  return <LegalPage texto={texto[locale] || texto.es} titulo={getDictionary(locale).legal.privacyTitle} />
}
