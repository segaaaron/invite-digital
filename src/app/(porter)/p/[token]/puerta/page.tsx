import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { checkin, plans, porters } from '@/app/composition/container'
import {
  adjustArrivalAsPorterAction,
  checkInByGroupAsPorterAction,
  porterAccessOkAction,
  recordScansAsPorterAction,
  voidArrivalAsPorterAction,
} from '@/app/_acciones/checkin/porter-actions'
import { DoorMode } from '@/modules/checkin/ui/DoorMode'
import { EnVivo } from '@/shared/design/ui/panel/EnVivo'
import { isErr } from '@/shared/result'

// Se instala en la pantalla de inicio: es como la va a usar el portero toda la noche.
export const metadata = { title: 'Puerta', manifest: '/manifest.webmanifest' }
export const dynamic = 'force-dynamic'

/**
 * La puerta del portero: el mismo modo puerta del panel, con sus acciones —que sacan el
 * evento del portero— y sin un solo enlace al panel. Sin acceso válido, vuelve al PIN.
 */
export default async function PorterDoorPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const guardado = (await cookies()).get('door_porter')?.value
  if (guardado !== token) redirect(`/p/${token}`)

  const portero = await porters.resolve(token)
  if (isErr(portero)) redirect(`/p/${token}`)

  const puerta = await plans.requireFeature(portero.value.eventId, 'checkin')
  if (isErr(puerta)) redirect(`/p/${token}`)

  const manifest = await checkin.manifest(portero.value.eventId)
  if (isErr(manifest)) throw new Error(manifest.error.detail)

  return (
    <>
      <p className="sr-only">
        {portero.value.eventTitle} · {portero.value.gate ?? 'Puerta'} · {portero.value.name}
      </p>
      {/* Lo que registran las otras puertas entra solo, en vivo. */}
      <EnVivo modo="auto" oculto tipos={['ingreso']} url={`/p/${token}/en-vivo`} />
      <DoorMode
        acciones={{
          recordScans: recordScansAsPorterAction,
          checkInByGroup: checkInByGroupAsPorterAction,
          adjust: adjustArrivalAsPorterAction,
          void: voidArrivalAsPorterAction,
          comprobarAcceso: porterAccessOkAction,
        }}
        cabecera={`${portero.value.eventTitle} · ${portero.value.gate ?? 'Puerta'} · ${portero.value.name}`}
        eventId={portero.value.eventId}
        eventSlug={portero.value.eventSlug}
        manifest={manifest.value}
      />
    </>
  )
}
