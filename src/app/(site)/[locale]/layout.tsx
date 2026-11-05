import { notFound } from 'next/navigation'
import { Suspense, type ReactNode } from 'react'
import { BarraDeCarga } from '@/shared/design/ui/BarraDeCarga'
import { display, sans } from '@/shared/design/fonts'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { LOCALES } from '@/shared/i18n/locales'
import { parseLocaleParam } from '@/shared/i18n/server'
import { site, webPublica } from '@/app/composition/container'
import { fiestaDeCategoria } from '@/sections/fiestas'
import type { Fiesta } from '@/shared/i18n/dictionary'
import { registrarFallo } from '@/shared/observability/fallos'
import { enlaceWhatsapp, sitioPublico } from '@/modules/admin/domain/site-settings'
import { SiteFooter } from '@/sections/SiteFooter'
import { SiteHeader } from '@/sections/SiteHeader'
import { WhatsAppFloat } from '@/sections/WhatsAppFloat'
import { VIEWPORT } from '@/shared/config/viewport'
import '../../globals.css'
// La piel de la portada nueva: la cabecera y el pie también la usan, así que vive aquí.
import '@/sections/portada/portada.css'
import { CapturaDeFallos } from '@/shared/design/ui/CapturaDeFallos'
import { ValidacionDeFormularios } from '@/shared/design/ui/ValidacionDeFormularios'
import { IdiomaProvider } from '@/shared/i18n/idioma-navegador'

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

  // Las celebraciones que el pie puede ofrecer: las que tienen algún modelo a la venta. La lectura
  // va cacheada con el resto del catálogo. Si la base no responde, el pie las enseña todas —es lo
  // que hacía siempre— y el fallo queda anotado.
  const TODAS: readonly Fiesta[] = ['boda', 'xv', 'cumple']
  const modelos = await webPublica.modelos(locale).catch((cause: unknown) => {
    registrarFallo('(site)/layout', 'No se pudo leer el catálogo para el pie:', cause)
    return null
  })
  if (modelos !== null && !modelos.ok) registrarFallo('(site)/layout', 'El catálogo del pie llegó con error:', modelos.error)
  const fiestas: readonly Fiesta[] = modelos === null || !modelos.ok ? TODAS : [...new Set(modelos.value.map((m) => fiestaDeCategoria(m.categorySlug)))]

  return (
    <html lang={locale} className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <body><IdiomaProvider locale={locale}>
        <CapturaDeFallos />
        <ValidacionDeFormularios />
        <Suspense fallback={null}>
          <BarraDeCarga />
        </Suspense>
        <SiteHeader dictionary={dictionary} locale={locale} whatsapp={enlaceWhatsapp(ajustes.whatsapp, ajustes.mensajes.general[locale])} />
        <main id="top">{children}</main>
        <SiteFooter dictionary={dictionary} fiestas={fiestas} locale={locale} sitio={sitio} />
        <WhatsAppFloat href={enlaceWhatsapp(ajustes.whatsapp, ajustes.mensajes.general[locale])} label={dictionary.footer.whatsappFloat} />
      </IdiomaProvider></body>
    </html>
  )
}
