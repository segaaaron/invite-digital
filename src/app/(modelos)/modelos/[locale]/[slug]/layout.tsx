import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { themeFonts } from '@/shared/design/fonts'
import { parseLocaleParam } from '@/shared/i18n/server'
import { VIEWPORT } from '@/shared/config/viewport'
import '../../../../globals.css'
import '@/modules/events/ui/themes/kit/keyframes.css'

export const viewport = VIEWPORT

/**
 * La raíz de la vista previa de un modelo.
 *
 * Es raíz propia y no cuelga del sitio público a propósito: con la cabecera de la web
 * encima, lo que se enseña no es el modelo, es el modelo dentro de otra cosa. El cliente
 * viene a ver **exactamente** lo que va a recibir el invitado.
 *
 * La ruta es `/modelos/<idioma>/<clave>` y no `/<idioma>/modelos/<clave>`: el segmento
 * literal va delante para que este grupo no choque con el `[locale]` del sitio, que está
 * al mismo nivel.
 */
export default async function ModelPreviewLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale: crudo, slug } = await params
  const locale = parseLocaleParam(crudo)
  if (locale === null) notFound()

  const tema = themeFor(slug)
  const variables = tema.fonts.map((clave) => themeFonts[clave].variable).join(' ')

  return (
    <html className={variables} lang={locale} suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  )
}
