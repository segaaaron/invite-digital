import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { display, sans } from '@/shared/design/fonts'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { LOCALES } from '@/shared/i18n/locales'
import { parseLocaleParam } from '@/shared/i18n/server'
import { SiteFooter } from '@/sections/SiteFooter'
import { SiteHeader } from '@/sections/SiteHeader'
import '../globals.css'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = parseLocaleParam(raw)
  if (!locale) notFound()

  const dictionary = getDictionary(locale)

  return (
    <html lang={locale} className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <body>
        <SiteHeader locale={locale} dictionary={dictionary} />
        <main id="top">{children}</main>
        <SiteFooter locale={locale} dictionary={dictionary} />
      </body>
    </html>
  )
}
