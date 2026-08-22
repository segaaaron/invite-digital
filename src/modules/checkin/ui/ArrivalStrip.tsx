import type { DoorTally } from '../domain/door-tally'

/**
 * Cuánta gente ha llegado, en la página del evento. Es el dato que el atelier mira desde
 * el móvil durante la recepción sin tener que abrir el modo puerta, que ocupa la
 * pantalla entera y está pensado para quien escanea.
 *
 * `tally` a `null` significa que este evento no tiene puerta —su plan no incluye el
 * check-in— y entonces la tira no existe: una tira de ceros haría creer que la recepción
 * empezó y no ha llegado nadie.
 */
export function ArrivalStrip({ tally }: { tally: DoorTally | null }) {
  if (tally === null) return null

  const cifras = [
    { label: 'Grupos que llegaron', value: `${tally.arrivedGroups} de ${tally.expectedGroups}` },
    { label: 'Personas dentro', value: `${tally.headsInside} de ${tally.expectedHeads}` },
  ] as const

  return (
    <div className="flex flex-col gap-3 border-y border-[var(--color-line)] py-6">
      <div className="grid grid-cols-2 gap-6">
        {cifras.map((cifra) => (
          <div key={cifra.label}>
            <p className="font-display text-[28px] font-light text-gold-deep">{cifra.value}</p>
            <p className="mt-1 text-[10.5px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">{cifra.label}</p>
          </div>
        ))}
      </div>

      {tally.arrivedGroups === 0 ? (
        // El estado inicial se dice con palabras. Dos ceros a secas se leen igual que
        // una tira rota, y quien la mira necesita saber que la puerta está lista.
        <p className="text-[12px] text-ink-mute">Todavía no ha llegado nadie. La puerta está lista.</p>
      ) : null}

      {tally.unexpectedGroups === 0 ? null : (
        <p className="text-[12px] text-ink-soft">
          {tally.unexpectedGroups === 1
            ? '1 grupo llegó sin estar entre los esperados.'
            : `${tally.unexpectedGroups} grupos llegaron sin estar entre los esperados.`}
        </p>
      )}
    </div>
  )
}
