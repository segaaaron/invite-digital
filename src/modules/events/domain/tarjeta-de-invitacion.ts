import type { InvitationContent } from './invitation-content'

/**
 * Lo que se lee al pegar el enlace de una invitación en WhatsApp: título, descripción y el
 * texto de la imagen. Sale de la portada y la fecha de la invitación; sin portada, del evento.
 *
 * Con contraseña no dice nada del evento: la puerta tampoco lo dice, y la vista previa la ve
 * cualquiera a quien le reenvíen el mensaje.
 */
export type TarjetaDeInvitacion = {
  readonly antetitulo: string | null
  readonly nombres: string | null
  readonly fecha: string | null
  readonly titulo: string
  readonly descripcion: string
}

const FECHA = { es: 'es-BO', en: 'en-GB' } as const

function fechaLegible(startsAt: string | undefined, eventDate: string, locale: 'es' | 'en'): string {
  const [dia = eventDate, hora = ''] = (startsAt ?? eventDate).split('T')
  const fecha = new Date(`${dia}T12:00:00Z`)
  if (Number.isNaN(fecha.getTime())) return eventDate
  const texto = new Intl.DateTimeFormat(FECHA[locale], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(fecha)
  return hora === '' ? texto : `${texto} · ${hora.slice(0, 5)}`
}

export function tarjetaDeInvitacion(input: {
  evento: { readonly title: string; readonly eventDate: string; readonly locale: 'es' | 'en' }
  contenido: InvitationContent
  invitado: string
  protegida: boolean
}): TarjetaDeInvitacion {
  const en = input.evento.locale === 'en'
  if (input.protegida) {
    return {
      antetitulo: null,
      nombres: null,
      fecha: null,
      titulo: en ? 'You have an invitation' : 'Tienes una invitación',
      descripcion: en ? `${input.invitado}, tap to open your invitation.` : `${input.invitado}, toca para abrir tu invitación.`,
    }
  }
  const { hero, schedule, reception } = input.contenido
  const nombres = [hero?.nameA, hero?.nameB].filter((n): n is string => n !== undefined && n.trim() !== '').join(' & ') || input.evento.title
  const antetitulo = hero?.eyebrow?.replace(/^[\s·•|-]+|[\s·•|-]+$/g, '') || null
  const fecha = fechaLegible(schedule?.startsAt, input.evento.eventDate, input.evento.locale)
  const lugar = reception?.place ? (en ? ` at ${reception.place}` : ` en ${reception.place}`) : ''
  return {
    antetitulo,
    nombres,
    fecha,
    titulo: antetitulo === null ? nombres : `${nombres} · ${antetitulo}`,
    descripcion: en
      ? `${input.invitado}, we look forward to seeing you on ${fecha}${lugar}. Tap to open your invitation.`
      : `${input.invitado}, te esperamos el ${fecha}${lugar}. Toca para abrir tu invitación.`,
  }
}
