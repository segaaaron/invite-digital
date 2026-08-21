import { revokeInvitationAction } from '../actions'

export type GuestGroupRowView = {
  readonly id: string
  readonly label: string
  readonly seats: number
  readonly revokedAt: Date | null
  /** Cupos confirmados en la última respuesta; `null` si el grupo aún no respondió. */
  readonly confirmed: number | null
}

const estado = (row: GuestGroupRowView): string => {
  if (row.revokedAt !== null) return 'Revocada'
  return row.confirmed === null ? 'Pendiente' : 'Confirmada'
}

export function GuestGroupTable({ eventSlug, groups }: { eventSlug: string; groups: readonly GuestGroupRowView[] }) {
  if (groups.length === 0) {
    return <p className="text-[14px] text-ink-soft">Todavía no hay invitados en este evento.</p>
  }

  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="text-[10.5px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">
          <th className="border-b border-[var(--color-line)] py-3 font-normal">Grupo</th>
          <th className="border-b border-[var(--color-line)] py-3 font-normal">Confirmados</th>
          <th className="border-b border-[var(--color-line)] py-3 font-normal">Estado</th>
          <th className="border-b border-[var(--color-line)] py-3 font-normal" />
        </tr>
      </thead>
      <tbody>
        {groups.map((row) => (
          <tr key={row.id}>
            <td className="border-b border-[var(--color-line)] py-4 text-[14px] text-ink">{row.label}</td>
            <td className="border-b border-[var(--color-line)] py-4 text-[14px] text-ink-soft">
              {`${row.confirmed ?? '—'} / ${row.seats}`}
            </td>
            <td className="border-b border-[var(--color-line)] py-4 text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">
              {estado(row)}
            </td>
            <td className="border-b border-[var(--color-line)] py-4 text-right">
              {row.revokedAt === null ? (
                <form action={revokeInvitationAction}>
                  <input name="groupId" type="hidden" value={row.id} readOnly />
                  <input name="eventSlug" type="hidden" value={eventSlug} readOnly />
                  <button className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute hover:text-gold-deep" type="submit">
                    Revocar
                  </button>
                </form>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
