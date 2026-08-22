import type { EventStats as Stats } from '../domain/stats'

/**
 * Las estadísticas del evento, construidas **solo con lo que ya se mide**: invitados,
 * quién respondió y quién confirmó.
 *
 * La maqueta prometía además dispositivos y fuentes de tráfico. No se miden en ninguna
 * parte del proyecto, así que no salen: llenar la pantalla con datos plausibles sería
 * mentir en un panel que alguien va a usar para decidir a quién llamar.
 */

const porcentaje = (valor: number | null): string | null => (valor === null ? null : `${valor} %`)

function Cifra({ label, value, hint }: { label: string; value: string; hint?: string | null }) {
  return (
    <div>
      <p className="font-display text-[32px] font-light text-gold-deep">{value}</p>
      <p className="mt-1 text-[10.5px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">{label}</p>
      {hint ? <p className="mt-1 font-mono text-[11px] text-ink-soft">{hint}</p> : null}
    </div>
  )
}

function Barra({ label, count, percent }: { label: string; count: number; percent: number; }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12px] text-ink-soft">{label}</span>
        <span className="font-mono text-[12px] text-ink">
          {count} · <span data-testid="desglose-porcentaje">{percent} %</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-[var(--radius-pill)] bg-bg-sunken">
        <div
          aria-label={label}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={percent}
          className="h-full rounded-[var(--radius-pill)] bg-gold transition-[width] duration-500 motion-reduce:transition-none"
          role="progressbar"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

export function EventStats({ stats }: { stats: Stats }) {
  if (stats.empty) {
    // Ceros y porcentajes en un evento recién creado se leen como un evento que nadie
    // contesta. Es distinto de no haber invitado a nadie todavía, y se dice.
    return (
      <p className="text-[13px] text-ink-mute">
        Todavía no hay invitados en este evento. Añade el primer grupo y aquí aparecerá cuánta gente respondió.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-5">
        <h2 className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">Embudo</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          <Cifra label="Grupos invitados" value={String(stats.groupsInvited)} />
          <Cifra
            hint={porcentaje(stats.respondedPercent)}
            label="Respondieron"
            value={String(stats.groupsResponded)}
          />
          <Cifra hint={porcentaje(stats.attendingPercent)} label="Confirmaron" value={String(stats.groupsAttending)} />
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">Cupos</h2>
        <p className="flex items-baseline gap-3">
          <span className="font-display text-[32px] font-light text-gold-deep">
            {stats.seatsConfirmed} de {stats.seatsInvited}
          </span>
          {/*
            Sin cupos invitados no hay contra qué medir los confirmados: no se pinta un
            porcentaje, que sería una división por cero disfrazada.
          */}
          {stats.seatsConfirmedPercent === null ? null : (
            <span className="font-mono text-[12px] text-ink-soft" data-testid="cupos-porcentaje">
              {stats.seatsConfirmedPercent} %
            </span>
          )}
        </p>
        <p className="text-[10.5px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">Cupos confirmados</p>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">Desglose del RSVP</h2>
        <div className="flex flex-col gap-5">
          <Barra count={stats.groupsAttending} label="Asisten" percent={stats.attendingPercent ?? 0} />
          <Barra count={stats.groupsDeclined} label="No asisten" percent={stats.declinedPercent ?? 0} />
          <Barra count={stats.groupsPending} label="Sin responder" percent={stats.pendingPercent ?? 0} />
        </div>
      </section>
    </div>
  )
}
