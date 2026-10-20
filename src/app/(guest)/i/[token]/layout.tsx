import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { sans, themeFonts } from '@/shared/design/fonts'
import { isErr } from '@/shared/result'
import { resolveInvitation } from './invitation'
import { TextosDeError } from './textos-de-error'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { VIEWPORT } from '@/shared/config/viewport'
import '../../../globals.css'
import '@/modules/events/ui/themes/kit/keyframes.css'
import { CapturaDeFallos } from '@/shared/design/ui/CapturaDeFallos'
import { ValidacionDeFormularios } from '@/shared/design/ui/ValidacionDeFormularios'
import { PortadasQueEsperan } from '@/modules/events/ui/themes/kit/PortadasQueEsperan'
import { SinVerCodigo } from '@/modules/events/ui/themes/kit/SinVerCodigo'
import { IdiomaProvider } from '@/shared/i18n/idioma-navegador'
import { idiomaDeLaPeticion } from '@/shared/i18n/idioma-servidor'

export const viewport = VIEWPORT

export const metadata = { robots: { index: false, follow: false } }

// Esta es la raíz de su rama: el grupo (guest) no lleva layout propio a propósito. Un
// layout de grupo que emitiera <html> quedaría por fuera de este y el idioma del evento
// no llegaría al atributo lang.

export default async function InvitationLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const invitation = await resolveInvitation(token)

  // Token desconocido y token revocado responden lo mismo: 404. Distinguirlos
  // confirmaría al atacante que el token existe. La caída de la base sí se distingue:
  // la lanza para que el límite de error responda 503.
  if (isErr(invitation)) {
    if (invitation.error.kind === 'storage_failure') throw new Error(invitation.error.detail)
    /**
     * La demo de un día que venció (0099) **no es un 404**: el enlace fue bueno y quien lo abre tarde es
     * un posible cliente. Como este layout es la raíz de la rama —es quien emite `<html>`—, un `notFound()`
     * aquí se comía la pantalla que la página sabe pintar. Se le da la carcasa mínima, sin las tipografías
     * del diseño, que ya no hay diseño que pintar, y la página dice el resto.
     */
    if (invitation.error.kind === 'demo_expired') {
      const idioma = await idiomaDeLaPeticion()
      return (
        <html className={sans.variable} lang={idioma} suppressHydrationWarning>
          <body className="antialiased">{children}</body>
        </html>
      )
    }
    notFound()
  }

  // Solo las tipografías que **este** diseño declara. Cargar las doce en toda invitación
  // son cientos de kilobytes de fuente que ese diseño no pinta, en un teléfono con datos.
  const tema = themeFor(invitation.value.event.themeKey)
  const variables = tema.fonts.map((clave) => themeFonts[clave].variable).join(' ')

  return (
    <html
      className={`${sans.variable} ${variables}`}
      lang={invitation.value.event.locale}
      suppressHydrationWarning
    >
      <body className="antialiased theme-protegida"><IdiomaProvider locale={invitation.value.event.locale}>
        <SinVerCodigo />
        <CapturaDeFallos />
        <ValidacionDeFormularios />
        <TextosDeError textos={getDictionary(invitation.value.event.locale).invitation.error}>{children}</TextosDeError>
        <PortadasQueEsperan />
      </IdiomaProvider></body>
    </html>
  )
}
