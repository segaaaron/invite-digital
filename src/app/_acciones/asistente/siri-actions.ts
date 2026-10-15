'use server'

import { identity } from '@/app/composition/container'
import { requireSession } from '@/app/_acciones/sesion'
import { registrarFallo } from '@/shared/observability/fallos'
import { tr } from '@/shared/i18n/idioma-servidor'

export type LlaveDeSiriState = { status: 'idle' } | { status: 'success'; llave: string } | { status: 'error'; message: string }

/**
 * **La llave del Atajo de Siri** de quien la pide (Mi cuenta › Luxury con Siri). Es una sesión propia, «Atajo de
 * Siri»: la anterior deja de valer, se ve en Sesiones abiertas y se cierra igual. Se enseña una sola vez.
 */
export async function crearLlaveDeSiriAction(): Promise<LlaveDeSiriState> {
  const t = await tr()
  const actor = await requireSession()
  // En modo soporte la cuenta es del cliente: el admin no le crea llaves.
  if (actor.soporte !== undefined || actor.role === 'puerta' || actor.role === 'admin') return { status: 'error', message: t('Esta cuenta no usa Luxury.', 'This account doesn’t use Luxury.') }
  try {
    return { status: 'success', llave: await identity.llaveDeSiri(actor.userId) }
  } catch (causa) {
    registrarFallo('asistente/siri-actions', 'crearLlaveDeSiriAction', causa)
    return { status: 'error', message: t('No pudimos crear la llave. Vuelve a intentarlo en un momento.', 'We couldn’t create the key. Try again in a moment.') }
  }
}
