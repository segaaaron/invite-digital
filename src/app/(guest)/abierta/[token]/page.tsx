import { notFound } from 'next/navigation'
import { events, guests } from '@/app/composition/container'
import { AltaConEnlaceGeneral } from '@/modules/guests/ui/AltaConEnlaceGeneral'
import { diaDelEvento } from '@/shared/format/fecha'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { isErr } from '@/shared/result'

/** El enlace general: el invitado escribe su nombre y quiénes van, y sale con su invitación. */
export default async function EnlaceGeneralPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const eventId = await guests.general.resolver(token)
  if (eventId === null) notFound()
  const evento = await events.getByIdUnscoped(eventId)
  if (isErr(evento)) notFound()
  const textos = getDictionary(evento.value.locale).openLink

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col justify-center gap-7 px-6 py-12 text-ink">
      <header className="flex flex-col gap-2 text-center">
        <p className="font-mono text-[10px] tracking-[0.3em] text-gold-deep uppercase">{diaDelEvento(evento.value.eventDate)}</p>
        <h1 className="font-display text-[34px] leading-tight font-light text-balance">{evento.value.title}</h1>
        <p className="text-[14px] leading-[1.7] text-ink-soft">{textos.intro}</p>
      </header>
      <AltaConEnlaceGeneral textos={textos} token={token} />
    </main>
  )
}
