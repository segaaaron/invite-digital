import Link from 'next/link'
import { RecoverForm } from '@/modules/identity/ui/RecoverForm'
import { PuertaConFoto } from '../_carcasa/PuertaConFoto'

export const metadata = { title: 'Recuperar contraseña', robots: { index: false, follow: false } }

export const dynamic = 'force-dynamic'

/**
 * Recuperar la contraseña.
 *
 * **Sin sesión y fuera de la carcasa del panel**, como la pantalla de entrar: quien llega
 * aquí no ha podido entrar, así que no hay barra lateral ni evento activo que pintar.
 *
 * No se indexa: es una pantalla de credenciales.
 */
export default function RecuperarPage() {
  return (
    <PuertaConFoto>
      <Link className="flex w-fit items-center gap-2 text-[14.5px] font-medium text-gold-deep underline underline-offset-4" href="/panel/entrar">
        <span aria-hidden>←</span> Volver a entrar
      </Link>
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[36px] leading-tight font-medium text-ink">Recupera tu acceso</h1>
        <p className="text-[15px] leading-[1.6] text-ink-mute">Te mandamos un código al correo. Con él eliges una contraseña nueva.</p>
      </header>
      <RecoverForm />
    </PuertaConFoto>
  )
}
