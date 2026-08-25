'use client'

import { useState } from 'react'
import { whatsappLink } from '@/modules/guests'
import { PanelButton, Pill, type PillTone } from '@/shared/design/ui/panel/PanelKit'
import { markReminderSentAction } from '../actions'
import type { DueReminder, ReminderKind } from '../domain/due'
import { reminderMessage } from '../domain/reminder-message'

const MOTIVO: Record<ReminderKind, { texto: string; tono: PillTone; explica: string }> = {
  sin_respuesta: {
    texto: 'Sin responder',
    tono: 'pending',
    explica: 'Abrió la invitación y no ha confirmado. El plazo se acerca.',
  },
  sin_abrir: {
    texto: 'Sin abrir',
    tono: 'no',
    explica: 'Nunca abrió el enlace. Puede que el mensaje no llegara: confirma el número antes de insistir.',
  },
}

/**
 * La cola de recordatorios del día.
 *
 * **El servidor decide a quién toca; envía una persona.** No hay proveedor de correo ni
 * disparador periódico, y llamar a esto «envío automático» en la pantalla sería mentir:
 * es una lista de tareas, y cada una se despacha abriendo WhatsApp con el mensaje escrito.
 *
 * El mensaje **no lleva el enlace de la invitación dentro**, y no es un olvido: de ese
 * token la base guarda solo su SHA-256. Se manda por el mismo chat donde está la
 * invitación, unas líneas más arriba, y a eso apunta el texto. Cuando el enlace se perdió
 * de verdad, la salida es reenviar desde «Enviar invitaciones».
 */
export function ReminderQueue({
  deadline,
  eventId,
  eventLocale,
  eventSlug,
  rows,
}: {
  deadline: Date
  eventId: string
  eventLocale: string
  eventSlug: string
  rows: readonly DueReminder[]
}) {
  const [anotando, setAnotando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (rows.length === 0) {
    return (
      <p className="text-[13px] text-ink-mute">
        Nadie por recordar hoy. Los grupos vuelven a aparecer aquí solos cuando toque.
      </p>
    )
  }

  const clave = (fila: DueReminder) => `${fila.groupId}:${fila.kind}`

  return (
    <div className="flex flex-col gap-3">
      {error === null ? null : (
        <p className="text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}

      <ul className="flex flex-col gap-2.5">
        {rows.map((fila) => {
          const motivo = MOTIVO[fila.kind]

          return (
            <li
              key={clave(fila)}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-line-panel bg-white p-3.5"
            >
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] text-ink">{fila.label}</span>
                  <Pill tone={motivo.tono}>{motivo.texto}</Pill>
                  {fila.phone === null ? <Pill tone="maybe">Sin teléfono</Pill> : null}
                </span>
                <span className="mt-1 block text-[11px] text-ink-mute">
                  {motivo.explica} Lleva {fila.waitingDays} días esperando · {fila.seats} cupos.
                </span>
              </span>

              {fila.phone === null ? null : (
                <PanelButton
                  external
                  href={whatsappLink({
                    phone: fila.phone,
                    message: reminderMessage({
                      kind: fila.kind,
                      locale: eventLocale,
                      groupLabel: fila.label,
                      deadline,
                    }),
                  })}
                  variant="primary"
                >
                  Recordar por WhatsApp
                </PanelButton>
              )}

              {/* No hay estado de «hecho» en el cliente, y no es un olvido: la acción
                  revalida el árbol y **remonta** este componente, así que cualquier
                  `useState` de aquí se pierde en ese mismo instante. Lo que se ve es la
                  cola recalculada, donde esta fila ya no está. */}
              <PanelButton
                disabled={anotando === clave(fila)}
                onClick={() => {
                  setAnotando(clave(fila))
                  setError(null)
                  void markReminderSentAction({ eventId, eventSlug, guestGroupId: fila.groupId, kind: fila.kind })
                    .then((estado) => {
                      // Dar el recordatorio por anotado sin que la base lo tenga hace que
                      // la fila vuelva mañana y que el atelier escriba dos veces.
                      if (estado.status === 'error') setError(estado.message)
                    })
                    .finally(() => setAnotando(null))
                }}
                title="Anota que ya lo recordaste. No vuelve a salir en unos días."
              >
                {anotando === clave(fila) ? 'Anotando…' : 'Marcar recordado'}
              </PanelButton>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
