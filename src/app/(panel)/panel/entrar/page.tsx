import { PuertaConFoto } from '../_carcasa/PuertaConFoto'
import { SignInForm } from '@/modules/identity/ui/SignInForm'
import { tr } from '@/shared/i18n/idioma-servidor'

export async function generateMetadata() {
  const t = await tr()
  return { title: t('Entrar · Panel', 'Sign in · Panel') }
}
// **Por petición, no prerenderizada.** La CSP lleva un nonce nuevo en cada respuesta y solo lo
// estampa en los scripts al renderizar: prerenderizada en el build, la página salía con scripts
// sin nonce, `strict-dynamic` los bloqueaba y la entrada funcionaba sin JavaScript (sin errores
// en pantalla, sin «Mostrar», y lo escrito se perdía si se enviaba antes de tiempo).
export const dynamic = 'force-dynamic'

/**
 * La puerta del panel.
 *
 * Es lo primero que se ve del producto cada mañana, así que no es un formulario suelto en
 * medio de una pantalla en blanco: dos mitades, la oscura con la marca —la misma tinta
 * `shell` de la barra lateral, para que entrar sea entrar en el panel y no en otro sitio—
 * y la marfil con el formulario.
 *
 * Por debajo de 860 —el corte de la carcasa del panel, no el de Tailwind— la mitad oscura
 * se convierte en una banda de cabecera: en un teléfono, media pantalla de decoración
 * dejaría el formulario por debajo del pliegue.
 */
export default async function SignInPage() {
  const t = await tr()
  return (
    <PuertaConFoto frase pie>
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[40px] leading-tight font-medium text-ink">{t('Entra a tu panel', 'Sign in to your panel')}</h1>
        <p className="text-[15px] text-ink-mute">{t('Con el correo y la contraseña que te dio el atelier.', 'With the email and password the atelier gave you.')}</p>
      </header>
      <SignInForm />
    </PuertaConFoto>
  )
}
