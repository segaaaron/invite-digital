import { notFound } from 'next/navigation'
import { events, guestbook, guests, rsvp } from '@/app/composition/container'
import { FeaturedMessages } from '@/modules/guestbook'
import { TallyStrip } from '@/modules/rsvp/ui/TallyStrip'
import { isErr } from '@/shared/result'

export const dynamic = 'force-dynamic'

const ESTADO = (confirmed: number | null, revoked: boolean): string => {
  if (revoked) return 'Revocada'
  return confirmed === null ? 'Pendiente' : 'Confirmada'
}

export default async function ClientSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const event = await events.resolveShare(token)

  // Enlace desconocido, caducado o revocado: los tres 404, sin distinguirlos.
  if (isErr(event)) {
    if (event.error.kind === 'storage_failure') throw new Error(event.error.detail)
    notFound()
  }

  const [groups, tally] = await Promise.all([guests.list(event.value.id), rsvp.tally(event.value.id)])
  if (isErr(groups) || isErr(tally)) throw new Error('No se pudieron leer los datos del evento')

  // Los destacados del libro de firmas. El bloque filtra por su cuenta y no pinta nada si
  // no hay ninguno: si la lectura falla, el cliente sigue viendo sus confirmaciones.
  const libro = await guestbook.list(event.value.id)

  const filas = await Promise.all(
    groups.value.map(async (group) => ({
      id: group.id,
      label: group.label,
      seats: group.seats,
      revoked: group.revokedAt !== null,
      confirmed: (await rsvp.latestFor(group.id))?.attending ?? null,
    })),
  )

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <p className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">{event.value.eventDate}</p>
        <h1 className="font-display text-[30px] font-light text-ink">{event.value.title}</h1>
      </header>

      <TallyStrip tally={tally.value} />

      {isErr(libro) ? null : <FeaturedMessages messages={libro.value} />}

      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="text-[10.5px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">
            <th className="border-b border-[var(--color-line)] py-3 font-normal">Grupo</th>
            <th className="border-b border-[var(--color-line)] py-3 font-normal">Confirmados</th>
            <th className="border-b border-[var(--color-line)] py-3 font-normal">Estado</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.id}>
              <td className="border-b border-[var(--color-line)] py-4 text-[14px] text-ink">{fila.label}</td>
              <td className="border-b border-[var(--color-line)] py-4 text-[14px] text-ink-soft">
                {`${fila.confirmed ?? '—'} / ${fila.seats}`}
              </td>
              <td className="border-b border-[var(--color-line)] py-4 text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">
                {ESTADO(fila.confirmed, fila.revoked)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
