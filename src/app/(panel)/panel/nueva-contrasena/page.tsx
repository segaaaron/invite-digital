import { redirect } from 'next/navigation'
import { ChangePasswordForm } from '@/modules/identity/ui/ChangePasswordForm'
import { requireSession } from '@/app/_acciones/sesion'

export const metadata = { title: 'Elige tu contraseña · Panel' }
export const dynamic = 'force-dynamic'

/**
 * La pantalla de la contraseña provisional, **antes del panel y fuera de él**.
 *
 * Su clave la escribió otra persona y viajó por correo, así que hasta que elija una suya no
 * entra a ninguna parte. Estaba dentro del panel, en «Mi cuenta», con la barra lateral al
 * lado: parecía que ya había entrado y que cambiarla era opcional. Aquí no hay barra ni
 * salida más que elegirla, como en cualquier producto que reparte claves iniciales.
 */
export default async function NuevaContrasenaPage() {
  const actor = await requireSession()
  // Quien ya eligió la suya no tiene nada que hacer aquí.
  if (!actor.mustChangePassword) redirect('/panel')

  return (
    <main className="grid min-h-dvh place-items-center bg-linear-to-b from-shell to-shell-deep px-5 py-10">
      <div className="w-full max-w-[460px] rounded-[20px] border border-line-panel bg-bg-raised p-7 shadow-float min-[560px]:p-9">
        <p className="font-display text-[20px] italic text-ink">
          Luxury <b className="font-medium not-italic">Atelier</b>
        </p>
        <h1 className="mt-6 font-display text-[28px] leading-tight text-ink">Elige tu contraseña</h1>
        <p className="mt-2 text-[13.5px] leading-[1.7] text-ink-soft">
          La que acabas de usar te la dio otra persona y viajó por correo, así que no puede ser la definitiva. Elige una tuya y entras al
          panel.
        </p>
        <p className="mt-1 text-[12.5px] text-ink-mute">Entrando como {actor.email}</p>

        <div className="mt-6">
          <ChangePasswordForm inicial />
        </div>
      </div>
    </main>
  )
}
