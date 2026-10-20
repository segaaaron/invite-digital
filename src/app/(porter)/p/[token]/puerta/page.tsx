import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { checkin, plans, porters } from '@/app/composition/container'
import {
  adjustArrivalAsPorterAction,
  checkInByGroupAsPorterAction,
  porterAccessAction,
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
  // La cookie es la sesión que el servidor firma tras el PIN, atada a este enlace. El token de
  // la URL no autoriza nada por sí solo: antes la cookie **era** ese token, así que reenviar el
  // enlace daba la lista de invitados y la puerta sin escribir nunca el PIN.
  const sesion = (await cookies()).get('door_porter')?.value
  if (sesion === undefined) redirect(`/p/${token}`)

  const portero = await porters.resolveDelEnlace({ cookie: sesion, token })
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
      {/* Lo que registran las otras puertas entra solo, en vivo. Y `invitado`: si el anfitrión revoca o
          devuelve una invitación, la lista de esta puerta se pone al día sin que nadie recargue. */}
      <EnVivo modo="auto" oculto tipos={['ingreso', 'invitado']} url={`/p/${token}/en-vivo`} />
      <DoorMode
        acciones={{
          recordScans: recordScansAsPorterAction,
          checkInByGroup: checkInByGroupAsPorterAction,
          adjust: adjustArrivalAsPorterAction,
          void: voidArrivalAsPorterAction,
          comprobarAcceso: porterAccessAction,
        }}
        cabecera={`${portero.value.eventTitle} · ${portero.value.gate ?? 'Puerta'} · ${portero.value.name}`}
        eventId={portero.value.eventId}
        enlaceDelPin={`/p/${token}`}
        eventSlug={portero.value.eventSlug}
        manifest={manifest.value}
      />
    </>
  )
}
