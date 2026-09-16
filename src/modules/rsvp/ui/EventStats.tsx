import { BarRow } from '@/shared/design/ui/panel/PanelKit'
import type { EventStats as Stats } from '../domain/stats'

/**
 * El embudo de conversión de la maqueta: una fila por paso, con su carril y su cifra a
 * la derecha, de más ancho a más estrecho.
 *
 * Está construido **solo con lo que ya se mide**: invitados, quién respondió y quién
 * confirmó. La maqueta pone además «visitaron el enlace» entre medias; las visitas se
 * cuentan por apertura y no por grupo, así que esa fila diría más visitas que invitados
 * y el embudo se ensancharía en mitad del cuello. Se queda fuera hasta que se mida por
 * grupo. Dispositivos y fuentes viven en sus propias tarjetas, con su propio dato.
 *
 * El desglose asisten / no asisten / sin responder no se repite aquí: es exactamente lo
 * que dice el donut que tiene al lado, con los mismos números.
 */
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

  const pasos = [
    { label: 'Invitaciones enviadas', count: stats.groupsInvited, percent: 100 },
    { label: 'Respondieron', count: stats.groupsResponded, percent: stats.respondedPercent ?? 0 },
    { label: 'Confirmaron', count: stats.groupsAttending, percent: stats.attendingPercent ?? 0 },
  ]

  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col">
        {pasos.map((paso) => (
          <li key={paso.label}>
            <BarRow label={paso.label} ratio={paso.percent / 100} value={String(paso.count)} />
          </li>
        ))}
      </ul>

      <div className="border-t border-line-panel pt-4">
        <p className="flex items-baseline gap-3">
          <span className="font-display text-[30px] font-light text-ink [font-variant-numeric:lining-nums]">
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
        <p className="mt-1 font-mono text-[9px] tracking-[0.3em] text-ink-mute uppercase">Cupos confirmados</p>
      </div>
    </div>
  )
}
