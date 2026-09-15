import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { events, plans } from '@/app/composition/container'
import { eventUnlocked } from '@/modules/events/actions'
import { MAX_GUEST_PHOTOS } from '@/modules/events/domain/media'
import { EventPasswordGate } from '@/modules/events/ui/EventPasswordGate'
import { GuestPhotoUpload } from '@/modules/events/ui/GuestPhotoUpload'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { isErr } from '@/shared/result'
import { resolveInvitation } from '../invitation'

export const dynamic = 'force-dynamic'

/** Las fotos de una boda no se indexan, como el pase. */
export const metadata = { robots: { index: false, follow: false } }

/**
 * Donde el invitado deja sus fotografías de la boda.
 *
 * Es una pantalla propia y no una tarjeta dentro de la invitación por lo mismo que el pase:
 * subir fotos es volver varias veces a lo largo del día, y hacerlo desde media invitación
 * obliga a desplazarse hasta el bloque cada vez. La tarjeta «Comparte tus fotos» que pintan
 * los diseños es la que trae aquí.
 *
 * Lleva **la misma puerta que la invitación**: sin la contraseña del evento no enseña ni el
 * título. Y lo que se ve son solo las fotografías de este grupo: las de los demás invitados
 * son suyas, y quien las mira es la pareja desde el panel.
 */
export default async function FotosPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invitation = await resolveInvitation(token)

  if (isErr(invitation)) {
    if (invitation.error.kind === 'storage_failure') throw new Error(invitation.error.detail)
    notFound()
  }

  const { group, event } = invitation.value

  if (!(await eventUnlocked(event.id))) return <EventPasswordGate token={token} />

  // Sin fotos de invitados en el plan, esta pantalla no existe: 404, como un enlace inválido.
  if (isErr(await plans.requireFeature(event.id, 'guestPhotos'))) notFound()

  const dictionary = getDictionary(event.locale).invitation
  const mias = await events.media.listOfGuest(group.id)

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col items-center gap-6 bg-bg-top px-6 py-12 text-ink">
      <header className="flex flex-col items-center gap-2 text-center">
        <p className="font-mono text-[9px] tracking-[0.3em] uppercase opacity-55">{event.title}</p>
        <h1 className="font-display text-[30px] leading-tight font-light italic">{dictionary.photosTitle}</h1>
        <p className="max-w-[36ch] text-[13px] leading-[1.7] text-ink-soft">{dictionary.photosIntro}</p>
      </header>

      <GuestPhotoUpload dictionary={dictionary} remaining={MAX_GUEST_PHOTOS - mias.length} token={token} />

      <section className="flex w-full flex-col gap-3">
        <h2 className="font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
          {dictionary.photosMine}
        </h2>
        {mias.length === 0 ? (
          <p className="text-[13px] text-ink-soft">{dictionary.photosEmpty}</p>
        ) : (
          <ul className="grid grid-cols-3 gap-2">
            {mias.map((foto) => (
              <li className="relative aspect-square overflow-hidden rounded-[12px] bg-bg-sunken" key={foto.id}>
                {/* Sin optimizar: `/media/[id]` ya sirve la versión reducida y reencodada,
                    y pasarla otra vez por el optimizador es un segundo recorte del mismo
                    archivo por cada miniatura. */}
                <Image
                  alt=""
                  className="h-full w-full object-cover"
                  height={200}
                  src={`/media/${foto.id}`}
                  unoptimized
                  width={200}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link className="text-[12px] underline underline-offset-4 opacity-65" href={`/i/${token}`}>
        {dictionary.photosBack}
      </Link>
    </main>
  )
}
