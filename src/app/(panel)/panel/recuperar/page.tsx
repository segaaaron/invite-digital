import Link from 'next/link'
import { RecoverForm } from '@/modules/identity/ui/RecoverForm'

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
    <main className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="flex w-full max-w-[420px] flex-col gap-7">
        <header className="flex flex-col gap-2">
          <p className="font-mono text-[10px] tracking-[0.18em] text-ink-mute uppercase">Luxury Atelier</p>
          <h1 className="font-display text-[30px] leading-tight font-light text-ink">Recuperar contraseña</h1>
          <p className="text-[13px] leading-[1.7] text-ink-soft">
            Te mandamos un código al correo. Con él eliges una contraseña nueva.
          </p>
        </header>

        <RecoverForm />

        <p className="text-[12px] text-ink-mute">
          <Link className="underline underline-offset-4 hover:text-ink" href="/panel/entrar">
            Volver a entrar
          </Link>
        </p>
      </div>
    </main>
  )
}
