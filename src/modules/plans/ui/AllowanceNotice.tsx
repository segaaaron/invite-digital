import Link from 'next/link'
import { T } from '@/shared/i18n/idioma-navegador'
import type { Mejorar } from './FeatureLocked'
import { canAddGroup, remainingGroups, usageRatio, WARNING_RATIO } from '../domain/allowance'

/**
 * El aviso antes del choque. Chocar contra un límite sin haberlo visto venir es la peor
 * forma de descubrirlo: el atelier estaría cargando la lista de una boda y se quedaría
 * a medias sin explicación.
 *
 * Tres estados y ni uno más: nada, aviso al 80 % y tope. Avisar desde el primer grupo
 * convertiría el aviso en ruido, y el ruido se ignora justo cuando deja de serlo.
 */
export function AllowanceNotice({
  maxGuestGroups,
  currentGroups,
  mejorar,
}: {
  maxGuestGroups: number | null
  currentGroups: number
  /** Lo decide la página según quién mira, como en `FeatureLocked`. */
  mejorar: Mejorar
}) {
  // Sin límite no hay nada que avisar, ni con miles de grupos.
  const uso = usageRatio(maxGuestGroups, currentGroups)
  if (uso === null) return null

  const enlace =
    mejorar === null ? (
      <T en="Talk to whoever organizes your event" es="Habla con quien organiza tu evento" />
    ) : (
      <Link className="underline underline-offset-4" href={mejorar.href}>
        {mejorar.label}
      </Link>
    )

  if (!canAddGroup(maxGuestGroups, currentGroups)) {
    return (
      <p className="rounded-[14px] border border-gold-deep px-5 py-4 text-[13px] text-gold-deep" role="alert">
        <T en={`The plan allows no more invitations: all ${maxGuestGroups} are used.`} es={`El plan no admite más invitaciones: son ${maxGuestGroups} y ya están todos.`} /> {enlace}{' '}
        <T en="to keep adding." es="para seguir añadiendo." />
      </p>
    )
  }

  if (uso < WARNING_RATIO) return null

  // `remainingGroups` no devuelve negativos, así que aquí siempre es un número que se
  // puede leer en voz alta.
  const quedan = remainingGroups(maxGuestGroups, currentGroups)

  return (
    <p className="rounded-[14px] border border-line px-5 py-4 text-[13px] text-ink-mute" role="status">
      <T en={`${quedan} of the plan’s ${maxGuestGroups} invitations left.`} es={`Quedan ${quedan} invitaci${quedan === 1 ? 'ón' : 'ones'} de las ${maxGuestGroups} del plan.`} /> {enlace}{' '}
      <T en="if you need more." es="si necesitas más." />
    </p>
  )
}
