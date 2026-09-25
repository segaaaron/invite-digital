import { notFound } from 'next/navigation'
import { Suspense, type ReactNode } from 'react'
import { BarraDeCarga } from '@/shared/design/ui/BarraDeCarga'
import { display, sans } from '@/shared/design/fonts'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { LOCALES } from '@/shared/i18n/locales'
import { parseLocaleParam } from '@/shared/i18n/server'
import { site } from '@/app/composition/container'
import { enlaceWhatsapp, sitioPublico } from '@/modules/admin/domain/site-settings'
import { SiteFooter } from '@/sections/SiteFooter'
import { SiteHeader } from '@/sections/SiteHeader'
import { WhatsAppFloat } from '@/sections/WhatsAppFloat'
import { VIEWPORT } from '@/shared/config/viewport'
import '../../globals.css'

export const viewport = VIEWPORT

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
  const ajustes = await site.settings()
  const sitio = sitioPublico(ajustes, locale)

  return (
    <html lang={locale} className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <body>
        <Suspense fallback={null}>
          <BarraDeCarga />
        </Suspense>
        <SiteHeader locale={locale} dictionary={dictionary} />
        <main id="top">{children}</main>
        <SiteFooter dictionary={dictionary} locale={locale} sitio={sitio} />
        <WhatsAppFloat href={enlaceWhatsapp(ajustes.whatsapp, ajustes.mensajes.general[locale])} label={dictionary.footer.whatsappFloat} />
      </body>
    </html>
  )
}
