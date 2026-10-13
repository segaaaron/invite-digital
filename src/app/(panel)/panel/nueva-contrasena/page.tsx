import { redirect } from 'next/navigation'
import { ChangePasswordForm } from '@/modules/identity/ui/ChangePasswordForm'
import { requireSession } from '@/app/_acciones/sesion'
import { PuertaConFoto } from '../_carcasa/PuertaConFoto'

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
    <PuertaConFoto>
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[36px] leading-tight font-medium text-ink">Elige tu contraseña</h1>
        <p className="text-[15px] leading-[1.6] text-ink-mute">La que te enviamos era provisional. Con la tuya entras desde ahora.</p>
        <p className="text-[13.5px] text-ink-mute">Entrando como {actor.email}</p>
      </header>
      <ChangePasswordForm />
    </PuertaConFoto>
  )
}
