'use client'

import { useState } from 'react'
import { whatsappLink } from '@/modules/guests'
import { avatarColor } from '@/shared/design/ui/avatar-color'
import { CheckIcon, WhatsAppIcon } from '@/shared/design/ui/icons'
import { Pill } from '@/shared/design/ui/panel/PanelKit'
import { markReminderSentAction } from '@/app/_acciones/reminders/actions'
import type { DueReminder, ReminderKind } from '../domain/due'
import { reminderMessage } from '../domain/reminder-message'

/** El motivo, dicho **una vez por grupo** (9 oct): repetido en cada fila, la lista era el mismo párrafo ocho veces. */
const GRUPOS: readonly { kind: ReminderKind; titulo: string; explica: string }[] = [
  { kind: 'sin_respuesta', titulo: 'Abrieron y no confirmaron', explica: 'Abrió la invitación y no ha confirmado. El plazo se acerca.' },
  {
    kind: 'sin_abrir',
    titulo: 'No han abierto',
    explica: 'Nunca abrió el enlace. Puede que el mensaje no llegara: confirma el número antes de insistir.',
  },
]

/** Cuántas filas se ven antes de «Ver las N restantes». */
const VISIBLES = 5

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** «el sábado 18 de octubre, en 5 días» (o «hoy», «mañana»), contado en Bolivia. */
function cierre(deadline: Date): string {
  const hoy = Date.parse(`${new Date(Date.now() - 4 * 3_600_000).toISOString().slice(0, 10)}T00:00:00Z`)
  const dias = Math.round((Date.UTC(deadline.getUTCFullYear(), deadline.getUTCMonth(), deadline.getUTCDate()) - hoy) / 86_400_000)
  const fecha = `el ${SEMANA[deadline.getUTCDay()]} ${deadline.getUTCDate()} de ${MESES[deadline.getUTCMonth()]}`
  return dias === 0 ? 'hoy' : dias === 1 ? `mañana, ${fecha}` : dias > 1 ? `${fecha}, en ${dias} días` : `cerró ${fecha}`
}

/**
 * La cola de recordatorios del día, como la resuelven las plataformas de bodas (9 oct, rediseño): arriba
 * cuántos y cuándo cierra el plazo; debajo, agrupados por motivo y con el motivo dicho una vez, filas
 * compactas con una acción ligera. **Tocar «Recordar» abre WhatsApp y ya lo anota**, como el modal de envío:
 * dos botones por fila eran dos pasos para lo mismo. «Ya le avisé» queda para quien escribió por otro lado.
 *
 * **El servidor decide a quién toca; envía una persona.** No hay disparador periódico: es una lista de
 * tareas, y cada una se despacha abriendo WhatsApp con el mensaje escrito. El mensaje **no lleva el enlace
 * de la invitación** (de ese token la base guarda solo su SHA-256): apunta al mensaje anterior del mismo chat.
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
  const [todas, setTodas] = useState(false)

  if (rows.length === 0) {
    return <p className="text-[13px] text-ink-mute">Nadie por recordar hoy. Vuelven a aparecer aquí solos cuando toque.</p>
  }

  const clave = (fila: DueReminder) => `${fila.groupId}:${fila.kind}`
  // No hay estado de «hecho» en el cliente, y no es un olvido: la acción revalida el árbol y **remonta** este
  // componente. Lo que se ve es la cola recalculada, donde la fila ya no está.
  const anotar = (fila: DueReminder) => {
    setAnotando(clave(fila))
    setError(null)
    void markReminderSentAction({ eventId, eventSlug, guestGroupId: fila.groupId, kind: fila.kind })
      .then((estado) => {
        // Dar el recordatorio por anotado sin que la base lo tenga hace que la fila vuelva mañana.
        if (estado.status === 'error') setError(estado.message)
      })
      .finally(() => setAnotando(null))
  }

  const ordenadas = GRUPOS.flatMap((g) => rows.filter((r) => r.kind === g.kind))
  const vistas = todas ? ordenadas : ordenadas.slice(0, VISIBLES)
  const restantes = ordenadas.length - vistas.length

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[14px] text-ink-soft">
        <span className="font-display text-[22px] text-ink lining-nums">{rows.length}</span> por recordar · el plazo para confirmar cierra {cierre(deadline)}.
      </p>

      {error === null ? null : (
        <p className="text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}

      {GRUPOS.map((grupo) => {
        const delGrupo = vistas.filter((r) => r.kind === grupo.kind)
        const total = rows.filter((r) => r.kind === grupo.kind).length
        if (delGrupo.length === 0) return null
        return (
          <section className="flex flex-col gap-2" key={grupo.kind}>
            <div>
              <h3 className="text-[13px] font-medium text-ink">
                {grupo.titulo} · {total}
              </h3>
              <p className="text-[12.5px] text-ink-mute">{grupo.explica}</p>
            </div>
            <ul className="divide-y divide-line-panel overflow-hidden rounded-[14px] border border-line-panel bg-white">
              {delGrupo.map((fila) => {
                const ocupado = anotando === clave(fila)
                return (
                  <li className="flex items-center gap-3 px-3.5 py-2.5" key={clave(fila)}>
                    <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-full bg-linear-to-br font-display text-[15px] text-white italic ${avatarColor(fila.label)}`}>
                      {fila.label.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[14px] text-ink">{fila.label}</span>
                      <span className="text-[12px] text-ink-mute">
                        <span className="max-[559px]:hidden">esperando </span>
                        {fila.waitingDays} {fila.waitingDays === 1 ? 'día' : 'días'} · {fila.seats} {fila.seats === 1 ? 'lugar' : 'lugares'}
                        {/* En el celular, «sin teléfono» va en esta línea: la píldora a la derecha apretaba el nombre. */}
                        {fila.phone === null ? <span className="text-pill-maybe-ink min-[560px]:hidden"> · sin teléfono</span> : null}
                      </span>
                    </span>
                    {fila.phone === null ? (
                      <span className="max-[559px]:hidden">
                        <Pill tone="maybe">Sin teléfono</Pill>
                      </span>
                    ) : (
                      <a
                        aria-label={`Recordar a ${fila.label} por WhatsApp`}
                        className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[var(--radius-pill)] border border-whatsapp/40 px-4 text-[13px] text-whatsapp transition-colors hover:bg-whatsapp/8 max-[559px]:px-3"
                        href={whatsappLink({ phone: fila.phone, message: reminderMessage({ kind: fila.kind, locale: eventLocale, groupLabel: fila.label, deadline }) })}
                        onClick={() => anotar(fila)}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <WhatsAppIcon />
                        <span className="max-[559px]:sr-only">Recordar</span>
                      </a>
                    )}
                    <button
                      aria-busy={ocupado || undefined}
                      aria-label={`Ya le avisé a ${fila.label}`}
                      className="grid size-11 shrink-0 place-items-center rounded-full text-ink-mute transition-colors hover:bg-bg-top hover:text-ink disabled:opacity-50"
                      disabled={ocupado}
                      onClick={() => anotar(fila)}
                      title="Ya le avisé (por otro lado): no vuelve a salir en unos días."
                      type="button"
                    >
                      <CheckIcon className="size-4" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}

      {restantes > 0 ? (
        <button className="self-start text-[13px] text-gold-deep underline decoration-gold/50 underline-offset-4 hover:decoration-gold-deep" onClick={() => setTodas(true)} type="button">
          Ver las {restantes} restantes
        </button>
      ) : null}
    </div>
  )
}
