'use client'

import Link from 'next/link'
import { CheckIcon } from '@/shared/design/ui/icons'
import { CampoFecha } from '@/shared/design/ui/panel/campos-de-fecha'
import { useActionState, useId } from 'react'
import { FIELD_CLASS, Field, PanelAlert } from '@/shared/design/ui/panel/PanelKit'
import {
  addTaskAction,
  editTaskAction,
  moveTaskAction,
  type PlannerActionState,
  removeTaskAction,
  seedTasksAction,
  toggleTaskAction,
} from '@/app/_acciones/planner/actions'
import type { EstadoDeTarea, Responsable, Tarea } from '../domain/tareas'
import { Accion, type Evento, Ocultos } from './Accion'
import { ActionFeedback, SubmitButton, EmptyState } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'

const INICIAL: PlannerActionState = { status: 'idle' }

export const NOMBRE_RESPONSABLE: Record<Responsable, string> = { anfitrion: 'Anfitriones', planner: 'Planner', familia: 'Familia' }

export type TareaVista = Omit<Tarea, 'doneAt'> & {
  readonly estado: EstadoDeTarea
  /** Ya formateada por la página, en hora de Bolivia: «venció ayer», «mié 15», «2 oct». */
  readonly cuando: string
  /** Hecha porque su pantalla ya lo resolvió —un proveedor contratado, el presupuesto fijado—. */
  readonly porLaApp?: boolean
  /** Adónde se resuelve: «Ir a Proveedores». */
  readonly atajo?: { readonly href: string; readonly texto: string } | null
}

type Etapa = { clave: string; nombre: string }

type ValoresTarea = { title: string; stage: string; dueDate: string; assignee: string; notes: string }

const valoresDeTarea = (tarea: TareaVista | undefined, enviados: Record<string, string> | undefined): ValoresTarea =>
  enviados
    ? { title: enviados.title ?? '', stage: enviados.stage ?? '', dueDate: enviados.dueDate ?? '', assignee: enviados.assignee ?? 'anfitrion', notes: enviados.notes ?? '' }
    : { title: tarea?.title ?? '', stage: tarea?.stage ?? '', dueDate: tarea?.dueDate ?? '', assignee: tarea?.assignee ?? 'anfitrion', notes: tarea?.notes ?? '' }

function CamposDeTarea({ etapas, inicial }: { etapas: readonly Etapa[]; inicial: ValoresTarea }) {
  const id = useId()
  return (
    <div className="grid gap-3 min-[560px]:grid-cols-2">
      <Field htmlFor={`${id}-t`} label="Tarea">
        <input className={FIELD_CLASS} defaultValue={inicial.title} id={`${id}-t`} maxLength={200} name="title" required />
      </Field>
      <Field htmlFor={`${id}-e`} label="Etapa">
        <select className={FIELD_CLASS} defaultValue={inicial.stage || etapas[0]?.clave} id={`${id}-e`} name="stage">
          {etapas.map((e) => (
            <option key={e.clave} value={e.clave}>
              {e.nombre}
            </option>
          ))}
          <option value="propias">Tareas propias</option>
        </select>
      </Field>
      <Field htmlFor={`${id}-f`} label="Vence">
        <CampoFecha defaultValue={inicial.dueDate} id={`${id}-f`} name="dueDate" />
      </Field>
      <Field htmlFor={`${id}-r`} label="Se encarga">
        <select className={FIELD_CLASS} defaultValue={inicial.assignee} id={`${id}-r`} name="assignee">
          {(Object.keys(NOMBRE_RESPONSABLE) as Responsable[]).map((r) => (
            <option key={r} value={r}>
              {NOMBRE_RESPONSABLE[r]}
            </option>
          ))}
        </select>
      </Field>
    </div>
  )
}

/** La casilla de la tarea (E12): marcarla la cierra, desmarcarla la reabre. Su propio formulario. */
function Casilla({ tarea, evento }: { tarea: TareaVista; evento: Evento }) {
  const [estado, enviar, enviando] = useActionState(sinCaerse(toggleTaskAction), INICIAL)
  const hecha = tarea.estado === 'hecha'
  const label = hecha ? `Reabrir «${tarea.title}»` : `Marcar hecha «${tarea.title}»`
  return (
    <form action={enviar} className="flex shrink-0 flex-col">
      <Ocultos {...evento} extra={{ taskId: tarea.id }} />
      <button
        aria-label={label}
        aria-pressed={hecha}
        className="grid size-11 cursor-pointer place-items-center rounded-[10px] focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-60"
        disabled={enviando}
        title={label}
        type="submit"
      >
        <span
          className={`grid size-6 place-items-center rounded-[6px] border transition-colors ${hecha ? 'border-ink-mute bg-ink-mute text-white' : 'border-line-panel-strong bg-bg-raised hover:border-gold'}`}
        >
          {hecha ? <CheckIcon className="size-3.5" /> : null}
        </span>
      </button>
      {estado.status === 'error' ? (
        <span className="text-[11px] text-danger-deep" role="alert">
          {estado.message}
        </span>
      ) : null}
    </form>
  )
}

function FilaDeTarea({ tarea, evento, etapas }: { tarea: TareaVista; evento: Evento; etapas: readonly Etapa[] }) {
  const [edicion, guardar, guardando] = useActionState(sinCaerse(editTaskAction), INICIAL)
  const id = useId()
  const enviados = edicion.status === 'error' ? edicion.valores : undefined
  const extra = { taskId: tarea.id }
  const hecha = tarea.estado === 'hecha'

  return (
    <li aria-label={tarea.title} className="group/fila relative border-b border-line-panel py-3.5">
      <div className="flex items-center gap-3">
        {tarea.porLaApp ? (
          <span className="grid size-11 shrink-0 place-items-center" title="Resuelta en su pantalla">
            <span className="grid size-6 place-items-center rounded-[6px] bg-ink-mute text-white">
              <CheckIcon className="size-3.5" />
            </span>
          </span>
        ) : (
          <Casilla evento={evento} tarea={tarea} />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={`text-[15px] font-medium ${hecha ? 'text-ink-mute line-through' : 'text-ink'}`}>{tarea.title}</span>
          <span className="text-[13.5px] text-ink-mute">
            {NOMBRE_RESPONSABLE[tarea.assignee]}
            {tarea.porLaApp ? ' · resuelta en su pantalla' : ''}
          </span>
        </div>
        {tarea.atajo && !hecha ? (
          <Link className="shrink-0 text-[14px] font-medium text-gold-deep no-underline hover:underline max-[559px]:hidden" href={tarea.atajo.href}>
            {tarea.atajo.texto}
          </Link>
        ) : null}
        <span className={`w-[92px] shrink-0 text-right text-[14px] ${tarea.estado === 'atrasada' ? 'font-medium text-danger-deep' : hecha ? 'text-ink-mute' : 'text-ink'}`}>
          {tarea.cuando}
        </span>
      </div>

      {tarea.porLaApp ? null : (
        <details className="group ml-14">
          {/* En escritorio aparece al pasar por la fila, sin sumarle alto; en el celular, siempre a la vista. */}
          <summary className="inline-flex min-h-8 max-[767px]:min-h-11 cursor-pointer list-none items-center text-[12.5px] text-ink-mute hover:text-ink focus-visible:opacity-100 min-[860px]:absolute min-[860px]:right-0 min-[860px]:bottom-0 min-[860px]:min-h-6 min-[860px]:opacity-0 min-[860px]:group-hover/fila:opacity-100 min-[860px]:group-open:opacity-100 [&::-webkit-details-marker]:hidden">
            Editar, mover o quitar
          </summary>
          <div className="mt-3 flex flex-col gap-3 pb-1">
            <form action={guardar} className="flex flex-col gap-3">
              <Ocultos {...evento} extra={extra} />
              <div className="flex flex-col gap-3" key={enviados ? JSON.stringify(enviados) : 'base'}>
                <CamposDeTarea etapas={etapas} inicial={valoresDeTarea(tarea, enviados)} />
                <Field htmlFor={`${id}-n`} label="Notas">
                  <textarea className={FIELD_CLASS} defaultValue={valoresDeTarea(tarea, enviados).notes} id={`${id}-n`} maxLength={2000} name="notes" rows={2} />
                </Field>
              </div>
              <ActionFeedback errorsOnly state={edicion} />
              <div>
                <SubmitButton variant="default" pending={guardando} pendingLabel={'Guardando…'}>{'Guardar tarea'}</SubmitButton>
              </div>
            </form>
            <div className="flex flex-wrap gap-2">
              <Accion action={moveTaskAction} evento={evento} extra={{ ...extra, dir: 'arriba' }} label={`Subir «${tarea.title}»`}>
                Subir
              </Accion>
              <Accion action={moveTaskAction} evento={evento} extra={{ ...extra, dir: 'abajo' }} label={`Bajar «${tarea.title}»`}>
                Bajar
              </Accion>
              <Accion action={removeTaskAction} evento={evento} extra={extra} label={`Quitar «${tarea.title}»`} variant="danger">
                Quitar
              </Accion>
            </div>
          </div>
        </details>
      )}
    </li>
  )
}

export type GrupoDeTareas = { readonly clave: string; readonly titulo: string; readonly atrasada?: boolean; readonly tareas: readonly TareaVista[] }

/**
 * El plan de tareas por estado, como la maqueta (E12): «Atrasada», «Esta semana», «Más adelante», «Hechas hace poco».
 * Cada fila, su casilla, quién se encarga, adónde se resuelve y cuándo vence.
 */
export function TaskBoard({
  eventId,
  eventSlug,
  etapas,
  grupos,
  filtrando,
}: Evento & { etapas: readonly Etapa[]; grupos: readonly GrupoDeTareas[]; filtrando: boolean }) {
  const evento = { eventId, eventSlug }
  const conTareas = grupos.filter((g) => g.tareas.length > 0)

  if (conTareas.length === 0) {
    return filtrando ? (
      <EmptyState compact title="Nada en este filtro" />
    ) : (
      <EmptyState description="Suma lo que tienes que hacer antes de la fiesta, con su fecha y quién se encarga." icon={<CheckIcon />} title="Tu plan de tareas está en blanco" />
    )
  }

  return (
    <div className="flex flex-col gap-9">
      {conTareas.map((g) => (
        <section aria-label={g.titulo} key={g.clave}>
          <h2 className={`border-b border-line-panel pb-2.5 font-display text-[24px] font-medium ${g.atrasada ? 'text-danger-deep' : 'text-ink'}`}>{g.titulo}</h2>
          <ul className="flex flex-col">
            {g.tareas.map((t) => (
              <FilaDeTarea etapas={etapas} evento={evento} key={t.id} tarea={t} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/** Sumar una tarea propia. */
export function NewTaskForm({ eventId, eventSlug, etapas }: Evento & { etapas: readonly Etapa[] }) {
  const [estado, enviar, enviando] = useActionState(sinCaerse(addTaskAction), INICIAL)
  return (
    <form action={enviar} className="flex flex-col gap-3">
      <Ocultos eventId={eventId} eventSlug={eventSlug} />
      <CamposDeTarea etapas={etapas} inicial={valoresDeTarea(undefined, estado.status === 'error' ? estado.valores : undefined)} key={estado.status === 'error' ? JSON.stringify(estado.valores) : 'base'} />
      <ActionFeedback errorsOnly state={estado} />
      {estado.status === 'success' ? <PanelAlert tone="ok">Tarea añadida.</PanelAlert> : null}
      <div className="flex justify-end">
        <SubmitButton variant="primary" pending={enviando} pendingLabel={'Añadiendo…'}>{'Añadir tarea'}</SubmitButton>
      </div>
    </form>
  )
}

/** El plan está vacío hasta que se pide: la plantilla de su fiesta, con un toque. */
export function SeedTasksButton({ eventId, eventSlug }: Evento) {
  const [estado, enviar, enviando] = useActionState(sinCaerse(seedTasksAction), INICIAL)
  return (
    <form action={enviar} className="flex flex-col items-center gap-3">
      <Ocultos eventId={eventId} eventSlug={eventSlug} />
      <SubmitButton variant="primary" pending={enviando} pendingLabel={'Creando…'}>{'Crear el plan con la plantilla'}</SubmitButton>
      <ActionFeedback errorsOnly state={estado} />
    </form>
  )
}
