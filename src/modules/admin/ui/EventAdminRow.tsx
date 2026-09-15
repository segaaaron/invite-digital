'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useActionState, useId, useState } from 'react'
import { FIELD_CLASS, LABEL_CLASS, PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { ETAPAS, type Etapa } from '../domain/cartera'
import { SoporteDeBoda, type Anfitrion } from './SoporteDeBoda'
import { type AdminActionState } from '@/app/_acciones/admin/admin-comun'
import { deleteEventAsAdminAction, grantClientAccessAction, reassignEventAction, setEventPlanAction } from '@/app/_acciones/admin/bodas-actions'
import { SubmitButton } from '@/shared/design/ui/panel/estados'

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
  readonly planNombre: string | null
  /** La portada del diseño, o `null` si es un tema antiguo sin portada en el catálogo. */
  readonly portada: string | null
  /** El nombre del modelo: «Botánica», «Mascarada». */
  readonly modelo: string
  readonly grupos: number
  readonly enviados: number
  readonly respondidos: number
  readonly etapa: Etapa
  /** «en 12 días», «hoy», «hace 3 meses». Lo compone la página con la fecha de Bolivia. */
  readonly cuando: string
  /** Los anfitriones, para darles soporte: entrar como ellos o restablecer su acceso. */
  readonly anfitriones: readonly Anfitrion[]
}

export type OwnerChoice = { readonly id: string; readonly email: string }

/**
 * Una fila de la bandeja de eventos del admin, con sus tres mandos.
 *
 * Borrar pide escribir el `slug`, como la zona de peligro del propio evento: se lleva por
 * delante invitados, mesas, regalos y mensajes, y no se deshace. Un botón suelto para eso
 * en una lista de veinte filas es un accidente esperando a pasar.
 */
export function EventAdminRow({ event, owners, plans }: { event: EventAdminView; owners: readonly OwnerChoice[]; plans: readonly { slug: string; nombre: string }[] }) {
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
    <li className="flex flex-col overflow-hidden rounded-[18px] border border-line-panel bg-white shadow-card transition-shadow hover:shadow-float">
      <div className="flex flex-col min-[700px]:flex-row">
        {/* La portada del diseño: por el título no se reconoce una invitación, por su
            portada sí. Lleva a la vista previa de ese evento. */}
        <Link
          aria-label={`Ver la invitación de ${event.title}`}
          className="relative block aspect-[16/9] shrink-0 overflow-hidden bg-bg-sunken min-[700px]:aspect-auto min-[700px]:w-[168px]"
          href={`/panel/eventos/${event.slug}/vista-previa`}
        >
          {event.portada === null ? (
            <span aria-hidden className="absolute inset-0 bg-linear-to-br from-shell to-shell-deep" />
          ) : (
            <Image alt="" className="object-cover object-top transition-transform duration-300 hover:scale-[1.04] motion-reduce:transition-none" fill sizes="(max-width: 700px) 100vw, 168px" src={event.portada} />
          )}
          <span className="absolute top-2.5 left-2.5 flex flex-col items-center rounded-xl bg-white/95 px-2.5 py-1 shadow-card">
            <span className="font-display text-[22px] leading-none text-ink [font-variant-numeric:lining-nums]">{DIA.format(fecha)}</span>
            <span className="font-mono text-[8px] tracking-[0.2em] text-ink-mute uppercase">{MES.format(fecha).replace('.', '')}</span>
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-3.5 p-4 min-[700px]:p-5">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <span className="flex min-w-0 flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2.5">
                <Link className="font-display text-[22px] leading-tight text-ink underline-offset-4 hover:underline" href={`/panel/eventos/${event.slug}/configuracion`}>
                  {event.title}
                </Link>
                <Pill tone={etapa.tono}>{etapa.etiqueta}</Pill>
              </span>
              <span className="text-[12px] text-ink-soft first-letter:uppercase">
                {event.cuando} · {event.modelo} · plan {event.planNombre ?? 'sin plan'}
              </span>
            </span>
            <span className="flex gap-2">
              <PanelButton href={`/panel/eventos/${event.slug}/configuracion`} variant="primary">
                Abrir
              </PanelButton>
              <PanelButton href={`/panel/eventos/${event.slug}/vista-previa`}>Ver</PanelButton>
            </span>
          </div>

          <div className="grid gap-3 min-[560px]:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            {/* Lo primero es **de quién es la boda**: el cliente que entra a su panel. Quien la
                lleva (el atelier o el admin) va debajo, más pequeño: es un dato de gestión. */}
            <span className="flex min-w-0 items-center gap-2.5">
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-bg-sunken font-display text-[14px] text-ink-soft uppercase">
                {(event.anfitriones[0]?.email ?? '?').slice(0, 1)}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className={LABEL_CLASS}>Cliente</span>
                {event.anfitriones.length === 0 ? (
                  <span className="text-[13px] text-ink-mute">Sin acceso de cliente todavía</span>
                ) : (
                  <span className="truncate text-[13px] text-ink" title={event.anfitriones.map((a) => a.email).join(', ')}>
                    {event.anfitriones[0]?.email}
                    {event.anfitriones.length > 1 ? <span className="text-ink-mute"> y {event.anfitriones.length - 1} más</span> : null}
                  </span>
                )}
                <span className="truncate text-[11.5px] text-ink-mute">
                  {event.ownerEmail === null ? <Pill tone="no">Sin responsable</Pill> : <>Lo lleva {event.ownerEmail}</>}
                </span>
              </span>
            </span>

            {event.grupos === 0 ? (
              <span className="flex flex-col justify-center">
                <span className={LABEL_CLASS}>Invitados</span>
                <span className="text-[13px] text-ink-mute">Todavía sin grupos de invitados</span>
              </span>
            ) : (
              <span className="flex flex-col gap-1.5">
                <span className="flex items-baseline justify-between">
                  <span className={LABEL_CLASS}>Confirmaciones</span>
                  <span className="font-display text-[16px] text-ink [font-variant-numeric:lining-nums]">
                    {Math.round((event.respondidos / event.grupos) * 100)}%
                  </span>
                </span>
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
                  <span>{event.respondidos} respondieron</span>
                </span>
              </span>
            )}
          </div>

      {/* Los mandos plegados: se viene a mirar la cartera, y cuatro formularios abiertos por
          fila convertían veinte bodas en una pared de campos. Plegados siguen en el DOM —la
          e2e de multitenencia lee el dueño preseleccionado igual— y se abren solos si algo
          falla. */}
      <details className="group" open={error !== null || acceso.status !== 'idle' || confirmando}>
        <summary className="w-fit cursor-pointer list-none border-t border-line-panel pt-3 font-mono text-[10px] tracking-[0.25em] text-ink-soft uppercase hover:text-ink">
          <span className="group-open:hidden">+ Gestionar: responsable, plan, acceso, soporte, borrar</span>
          <span className="hidden group-open:inline">− Cerrar</span>
        </summary>
        <div className="mt-3.5">
      <div className="flex flex-wrap items-end gap-3">
        <form action={reasignar} className="flex items-end gap-2">
          <input name="eventId" type="hidden" value={event.id} />
          <span className="flex flex-col gap-1.5">
            <label className={LABEL_CLASS} htmlFor={`${id}-dueno`}>
              Atelier responsable
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
              {plans.map((plan) => (
                <option key={plan.slug} value={plan.slug}>
                  {plan.nombre}
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
              placeholder="cliente@correo.com"
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
          <SubmitButton variant="default" pending={dandoAcceso} pendingLabel={'Dando…'}>{'Dar acceso'}</SubmitButton>
        </form>

        <div className="w-full border-t border-line-panel pt-3">
          <SoporteDeBoda anfitriones={event.anfitriones} eventId={event.id} />
        </div>

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
        </div>
      </div>
    </li>
  )
}
