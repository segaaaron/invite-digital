'use client'

import { ChartIcon } from '@/shared/design/ui/icons'
import { EmptyState } from '@/shared/design/ui/panel/estados'
import { BarRow } from '@/shared/design/ui/panel/PanelKit'
import type { EventStats as Stats } from '../domain/stats'
import { useT } from '@/shared/i18n/idioma-navegador'

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
  const t = useT()
  if (stats.empty) {
    // Ceros y porcentajes en un evento recién creado se leen como un evento que nadie
    // contesta. Es distinto de no haber invitado a nadie todavía, y se dice.
    return (
      <EmptyState compact description={t('Añade a tus invitados y aquí verás cuánta gente respondió.', 'Add your guests and here you will see how many replied.')} icon={<ChartIcon />} title={t('Aún no hay invitados', 'No guests yet')} />
    )
  }

  const pasos = [
    { label: t('Invitaciones enviadas', 'Invitations sent'), count: stats.groupsInvited, percent: 100 },
    { label: t('Respondieron', 'Replied'), count: stats.groupsResponded, percent: stats.respondedPercent ?? 0 },
    { label: t('Confirmaron', 'Attending'), count: stats.groupsAttending, percent: stats.attendingPercent ?? 0 },
  ]

  // Solo el embudo: los cupos confirmados ya los dice la tarjeta «Confirmados» del resumen, arriba.
  return (
    <ul className="flex flex-col">
      {pasos.map((paso) => (
        <li key={paso.label}>
          <BarRow label={paso.label} ratio={paso.percent / 100} value={String(paso.count)} />
        </li>
      ))}
    </ul>
  )
}
