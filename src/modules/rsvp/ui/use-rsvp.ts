'use client'

import { useActionState, useState } from 'react'
import type { InvitationDictionary } from '@/shared/i18n/dictionary'
import { type RsvpActionState, respondAction } from '../actions'

const INICIAL: RsvpActionState = { status: 'idle' }

type Entrada = {
  readonly dictionary: InvitationDictionary
  readonly previous: { attending: number; message: string | null; responderName: string | null } | null
  readonly seats: number
}

export type RsvpControl = {
  readonly formAction: (formData: FormData) => void
  readonly isPending: boolean
  /** El error ya resuelto contra el diccionario del evento, o `null`. */
  readonly error: string | null
  /** Hay una confirmación recién guardada que enseñar en vez del formulario. */
  readonly confirmed: boolean
  /** Vuelve al formulario tras confirmar, para cambiar la respuesta. */
  readonly reopen: () => void
  /** Las opciones del desplegable: de cero hasta los cupos del grupo. */
  readonly defaultAttending: string
  readonly defaultMessage: string
  /** El nombre con el que ya contestó, para no volver a escribirlo. */
  readonly defaultName: string
  /** Con quién saludar en el panel de gracias, o `null` si no dejó nombre. */
  readonly confirmedName: string | null
}

/**
 * El RSVP **sin piel**: todo el estado, ningún marcado.
 *
 * Existe porque cada uno de los dieciséis diseños pinta su propio formulario —la maqueta
 * trae seis marcados distintos solo entre los de XV— y porque el que había tenía la paleta
 * marfil clavada en las clases: dentro de la mascarada morada era una mancha de la web
 * pública.
 *
 * **La Server Action no se toca.** `respondAction` sigue con su candado de contraseña
 * —que cierra las escrituras, no solo el render— y su validación de cupos contra el
 * servidor. Este hook no valida nada: un hook cliente no es un sitio donde poner una
 * regla, porque quien manda el POST puede no ejecutarlo.
 */
export function useRsvp({ dictionary, previous, seats }: Entrada): RsvpControl {
  const [state, formAction, isPending] = useActionState(respondAction, INICIAL)
  // Cada resultado es un objeto nuevo, así que recordar el ya reconocido devuelve el
  // formulario al pulsar «cambiar» y vuelve a enseñar el panel tras el siguiente envío.
  const [reconocido, setReconocido] = useState<RsvpActionState | null>(null)

  return {
    formAction,
    isPending,
    error: state.status === 'error' ? dictionary.errors[state.message] : null,
    confirmed: state.status === 'success' && reconocido !== state,
    reopen: () => setReconocido(state),
    defaultAttending: String(previous?.attending ?? seats),
    defaultMessage: previous?.message ?? '',
    defaultName: previous?.responderName ?? '',
    // El nombre del saludo sale de **la respuesta que acaba de guardarse**, no del campo:
    // así dice el que quedó registrado y no el que se estuviera escribiendo.
    confirmedName: state.status === 'success' ? state.responderName : null,
  }
}
