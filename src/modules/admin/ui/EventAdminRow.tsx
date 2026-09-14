'use client'

import Link from 'next/link'
import { useActionState, useId, useState } from 'react'
import { FIELD_CLASS, LABEL_CLASS, PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { ETAPAS, type Etapa } from '../domain/cartera'
import {
  deleteEventAsAdminAction,
  grantClientAccessAction,
  reassignEventAction,
  setEventPlanAction,
  type AdminActionState,
} from '../actions'

const INICIAL: AdminActionState = { status: 'idle' }

const DIA = new Intl.DateTimeFormat('es-BO', { day: 'numeric', timeZone: 'UTC' })
const MES = new Intl.DateTimeFormat('es-BO', { month: 'short', year: '2-digit', timeZone: 'UTC' })

export type EventAdminView = {
  readonly id: string
  readonly slug: string
  readonly title: string
  readonly eventDate: string
  readonly ownerEmail: string | null
  readonly ownerId: string | null
  readonly planSlug: string | null
  readonly grupos: number
  readonly enviados: number
  readonly respondidos: number
  readonly etapa: Etapa
  /** «en 12 días», «hoy», «hace 3 meses». Lo compone la página con la fecha de Bolivia. */
  readonly cuando: string
}

export type OwnerChoice = { readonly id: string; readonly email: string }

/**
 * Una fila de la bandeja de eventos del admin, con sus tres mandos.
 *
 * Borrar pide escribir el `slug`, como la zona de peligro del propio evento: se lleva por
 * delante invitados, mesas, regalos y mensajes, y no se deshace. Un botón suelto para eso
 * en una lista de veinte filas es un accidente esperando a pasar.
 */
export function EventAdminRow({ event, owners, plans }: { event: EventAdminView; owners: readonly OwnerChoice[]; plans: readonly string[] }) {
  const [reasignado, reasignar, reasignando] = useActionState<AdminActionState, FormData>(reassignEventAction, INICIAL)
  const [plan, cambiarPlan, cambiandoPlan] = useActionState<AdminActionState, FormData>(setEventPlanAction, INICIAL)
  const [borrado, borrar, borrando] = useActionState<AdminActionState, FormData>(deleteEventAsAdminAction, INICIAL)
  /**
   * Dar acceso a esta boda **ya creada**.
   *
   * Es la otra mitad del alta de un paso: aquella crea boda y cliente de una vez, y esta
   * cubre la boda que ya existe —la que se creó antes de saber el correo del cliente, o a
   * la que hay que sumar a la otra parte de la pareja—.
   *
   * Es **la misma acción** que usa Configuración del evento, traída por el índice del
   * módulo y no reescrita aquí: una copia sería un segundo sitio donde olvidarse de que un
   * alta sobre un correo existente no toca su cuenta.
   */
  const [acceso, darAcceso, dandoAcceso] = useActionState<AdminActionState, FormData>(grantClientAccessAction, INICIAL)
  const [confirmando, setConfirmando] = useState(false)
  const id = useId()
  const etapa = ETAPAS.find((e) => e.clave === event.etapa) ?? ETAPAS[0]
  const fecha = new Date(`${event.eventDate}T00:00:00Z`)

  const error =
    reasignado.status === 'error'
      ? reasignado.message
      : plan.status === 'error'
        ? plan.message
        : borrado.status === 'error'
          ? borrado.message
          : null

  return (
    <li className="flex flex-col gap-3.5 border-b border-line-panel py-5 last:border-none">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="flex w-13 shrink-0 flex-col items-center rounded-xl border border-line-panel bg-white py-1.5 shadow-card">
          <span className="font-display text-[24px] leading-none text-ink [font-variant-numeric:lining-nums]">{DIA.format(fecha)}</span>
          <span className="font-mono text-[8px] tracking-[0.2em] text-ink-mute uppercase">{MES.format(fecha).replace('.', '')}</span>
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2.5">
            <Link className="font-display text-[20px] leading-tight text-ink underline-offset-4 hover:underline" href={`/panel/eventos/${event.slug}`}>
              {event.title}
            </Link>
            <Pill tone={etapa.tono}>{etapa.etiqueta}</Pill>
          </span>
          <span className="font-mono text-[10px] tracking-[0.15em] text-ink-mute uppercase">
            {event.cuando} · {event.slug} · plan {event.planSlug ?? 'sin plan'}
          </span>
          {/* Un evento sin dueño no debería existir; si aparece uno, la fila lo canta en
              vez de enseñar un hueco. */}
          {event.ownerEmail === null ? (
            <span>
              <Pill tone="no">Sin dueño</Pill>
            </span>
          ) : (
            <span className="text-[12px] text-ink-soft">{event.ownerEmail}</span>
          )}
        </span>

        <span className="flex w-full flex-col gap-1.5 min-[900px]:w-[260px]">
          {event.grupos === 0 ? (
            <span className="text-[12px] text-ink-mute">Sin grupos de invitados</span>
          ) : (
            <>
              <span
                aria-label={`${event.enviados} de ${event.grupos} enlaces repartidos, ${event.respondidos} respondieron`}
                className="relative h-2 overflow-hidden rounded-full bg-bg-sunken"
                role="img"
              >
                <span className="absolute inset-y-0 left-0 rounded-full bg-gold/35" style={{ width: `${(event.enviados / event.grupos) * 100}%` }} />
                <span className="absolute inset-y-0 left-0 rounded-full bg-sage" style={{ width: `${(event.respondidos / event.grupos) * 100}%` }} />
              </span>
              <span className="flex justify-between font-mono text-[10px] text-ink-soft [font-variant-numeric:lining-nums]">
                <span>{event.grupos} grupos</span>
                <span>{event.enviados} enviados</span>
                <span>{event.respondidos} RSVP</span>
              </span>
            </>
          )}
        </span>

        <span className="flex gap-2">
          <PanelButton href={`/panel/eventos/${event.slug}`}>Abrir</PanelButton>
          <PanelButton href={`/panel/eventos/${event.slug}/vista-previa`}>Ver</PanelButton>
        </span>
      </div>

      {/* Los mandos plegados: se viene a mirar la cartera, y cuatro formularios abiertos por
          fila convertían veinte bodas en una pared de campos. Plegados siguen en el DOM —la
          e2e de multitenencia lee el dueño preseleccionado igual— y se abren solos si algo
          falla. */}
      <details className="group" open={error !== null || acceso.status !== 'idle' || confirmando}>
        <summary className="w-fit cursor-pointer list-none font-mono text-[10px] tracking-[0.25em] text-ink-soft uppercase hover:text-ink">
          <span className="group-open:hidden">+ Gestionar: dueño, plan, acceso, borrar</span>
          <span className="hidden group-open:inline">− Cerrar</span>
        </summary>
        <div className="mt-3.5">
      <div className="flex flex-wrap items-end gap-3">
        <form action={reasignar} className="flex items-end gap-2">
          <input name="eventId" type="hidden" value={event.id} />
          <span className="flex flex-col gap-1.5">
            <label className={LABEL_CLASS} htmlFor={`${id}-dueno`}>
              Dueño
            </label>
            <select className={`${FIELD_CLASS} py-2`} defaultValue={event.ownerId ?? ''} id={`${id}-dueno`} name="userId">
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.email}
                </option>
              ))}
            </select>
          </span>
          <PanelButton disabled={reasignando} type="submit">
            Reasignar
          </PanelButton>
        </form>

        <form action={cambiarPlan} className="flex items-end gap-2">
          <input name="eventId" type="hidden" value={event.id} />
          <input name="eventSlug" type="hidden" value={event.slug} />
          <span className="flex flex-col gap-1.5">
            <label className={LABEL_CLASS} htmlFor={`${id}-plan`}>
              Plan
            </label>
            <select className={`${FIELD_CLASS} py-2`} defaultValue={event.planSlug ?? ''} id={`${id}-plan`} name="planSlug">
              {plans.map((slug) => (
                <option key={slug} value={slug}>
                  {slug}
                </option>
              ))}
            </select>
          </span>
          <PanelButton disabled={cambiandoPlan} type="submit">
            Cambiar
          </PanelButton>
        </form>

        <form action={darAcceso} className="flex flex-wrap items-end gap-2">
          <input name="eventId" type="hidden" value={event.id} />
          <input name="eventSlug" type="hidden" value={event.slug} />
          <span className="flex flex-col gap-1.5">
            <label className={LABEL_CLASS} htmlFor={`${id}-cliente`}>
              Acceso del cliente
            </label>
            <input
              autoComplete="off"
              className={`${FIELD_CLASS} py-2`}
              id={`${id}-cliente`}
              name="email"
              placeholder="novios@correo.com"
              required
              type="email"
            />
          </span>
          <span className="flex flex-col gap-1.5">
            {/* «Contraseña inicial» y no «Contraseña» a secas: en esta misma pantalla hay
                otros campos con ese nombre, y un `getByLabel('Contraseña')` sin acotar
                casaría con dos. Es lo que acaba de tumbar el inicio de sesión del setup. */}
            <label className={LABEL_CLASS} htmlFor={`${id}-clave-cliente`}>
              Contraseña inicial
            </label>
            <input
              autoComplete="new-password"
              className={`${FIELD_CLASS} py-2`}
              id={`${id}-clave-cliente`}
              name="password"
              type="text"
            />
          </span>
          <PanelButton disabled={dandoAcceso} type="submit">
            {dandoAcceso ? 'Dando…' : 'Dar acceso'}
          </PanelButton>
        </form>

        {confirmando ? (
          <form action={borrar} className="flex items-end gap-2">
            <input name="eventId" type="hidden" value={event.id} />
            <span className="flex flex-col gap-1.5">
              <label className={LABEL_CLASS} htmlFor={`${id}-conf`}>
                Escribe {event.slug}
              </label>
              <input autoFocus className={`${FIELD_CLASS} py-2`} id={`${id}-conf`} name="confirmation" required type="text" />
            </span>
            <PanelButton disabled={borrando} type="submit" variant="danger">
              Borrar de verdad
            </PanelButton>
            <PanelButton onClick={() => setConfirmando(false)}>Cancelar</PanelButton>
          </form>
        ) : (
          <PanelButton onClick={() => setConfirmando(true)} variant="danger">
            Borrar evento
          </PanelButton>
        )}
      </div>
        </div>
      </details>

      {error === null ? null : (
        <p className="text-[12px] text-danger" role="alert">
          {error}
        </p>
      )}

      {/* El acceso lleva su propio aviso y no entra en el `error` de arriba: su acierto
          trae texto —la contraseña no se vuelve a mostrar, y si el correo ya tenía cuenta
          lo dice—, y eso hay que enseñarlo, no solo el fallo. */}
      {acceso.status === 'error' ? (
        <p className="text-[12px] text-danger" role="alert">
          {acceso.message}
        </p>
      ) : null}
      {acceso.status === 'success' && acceso.message !== undefined ? (
        <p className="text-[12px] text-sage-deep" role="status">
          {acceso.message}
        </p>
      ) : null}
    </li>
  )
}
