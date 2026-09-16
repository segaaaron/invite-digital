import type { RsvpTally } from '../domain/tally'

export function TallyStrip({ tally }: { tally: RsvpTally }) {
  const cifras = [
    { label: 'Cupos confirmados', value: `${tally.seatsConfirmed} / ${tally.seatsInvited}` },
    { label: 'Invitaciones que respondieron', value: String(tally.groupsResponded) },
    { label: 'Invitaciones pendientes', value: String(tally.groupsPending) },
  ] as const

  return (
    <div className="grid grid-cols-3 gap-6 border-y border-[var(--color-line)] py-6">
      {cifras.map((cifra) => (
        <div key={cifra.label}>
          <p className="font-display text-[28px] font-light text-gold-deep">{cifra.value}</p>
          <p className="mt-1 text-[10.5px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">{cifra.label}</p>
        </div>
      ))}
    </div>
  )
}
