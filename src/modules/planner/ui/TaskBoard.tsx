'use client'

import Link from 'next/link'
import { CheckIcon } from '@/shared/design/ui/icons'
import { CampoFecha } from '@/shared/design/ui/panel/campos-de-fecha'
import { useActionState, useId } from 'react'
import { FIELD_CLASS, Field, PanelAlert, Pill, type PillTone } from '@/shared/design/ui/panel/PanelKit'
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
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'

const INICIAL: PlannerActionState = { status: 'idle' }

export const NOMBRE_RESPONSABLE: Record<Responsable, string> = { anfitrion: 'Anfitriones', planner: 'Planner', familia: 'Familia' }

const ESTADO: Record<EstadoDeTarea, { tono: PillTone; texto: string }> = {
  hecha: { tono: 'ok', texto: 'Hecha' },
  atrasada: { tono: 'no', texto: 'Atrasada' },
  semana: { tono: 'maybe', texto: 'Esta semana' },
  pendiente: { tono: 'pending', texto: 'Pendiente' },
}

export type TareaVista = Omit<Tarea, 'doneAt'> & {
  readonly estado: EstadoDeTarea
  /** Ya formateadas por la página, en hora de Bolivia. */
  readonly vence: string | null
  readonly hechaCuando: string | null
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

function FilaDeTarea({ tarea, evento, etapas }: { tarea: TareaVista; evento: Evento; etapas: readonly Etapa[] }) {
  const [edicion, guardar, guardando] = useActionState(editTaskAction, INICIAL)
  const id = useId()
  const enviados = edicion.status === 'error' ? edicion.valores : undefined
  const estado = ESTADO[tarea.estado]
  const extra = { taskId: tarea.id }

  return (
    <li aria-label={tarea.title} className="flex flex-col gap-2 border-b border-line-panel py-3 last:border-none">
      <div className="flex flex-wrap items-center gap-3">
        {tarea.porLaApp ? (
          <span className="grid w-[74px] place-items-center text-sage" title="Resuelta en su pantalla">
            <CheckIcon className="size-5" />
          </span>
        ) : (
          <Accion action={toggleTaskAction} evento={evento} extra={extra} label={tarea.estado === 'hecha' ? `Reabrir «${tarea.title}»` : `Marcar hecha «${tarea.title}»`}>
            {tarea.estado === 'hecha' ? 'Reabrir' : 'Hecha'}
          </Accion>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className={`text-[14px] ${tarea.estado === 'hecha' ? 'text-ink-mute line-through' : 'text-ink'}`}>{tarea.title}</span>
          <span className="text-[11px] text-ink-mute">
            {NOMBRE_RESPONSABLE[tarea.assignee]}
            {tarea.vence ? ` · vence ${tarea.vence}` : ' · sin fecha'}
            {tarea.hechaCuando ? ` · hecha ${tarea.hechaCuando}${tarea.doneBy ? ` por ${tarea.doneBy}` : ''}` : ''}
            {tarea.porLaApp ? ' · resuelta en su pantalla' : ''}
          </span>
        </div>
        {tarea.atajo && tarea.estado !== 'hecha' ? (
          <Link className="text-[12px] text-ink underline underline-offset-2" href={tarea.atajo.href}>
            {tarea.atajo.texto}
          </Link>
        ) : null}
        <Pill tone={estado.tono}>{estado.texto}</Pill>
      </div>

      <details className="group ml-0 min-[560px]:ml-24">
        <summary className="cursor-pointer text-[11px] text-ink-soft underline underline-offset-2">Editar, mover o quitar</summary>
        <div className="mt-3 flex flex-col gap-3">
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
    </li>
  )
}

/**
 * El plan de tareas: etapas plegables con sus tareas. Las etapas con algo atrasado o de esta
 * semana se abren solas, y las propias también —se acaban de escribir—; las demás, plegadas.
 */
export function TaskBoard({
  eventId,
  eventSlug,
  etapas,
  tareas,
  filtrando,
}: Evento & { etapas: readonly Etapa[]; tareas: readonly TareaVista[]; filtrando: boolean }) {
  const evento = { eventId, eventSlug }
  const grupos = [...etapas, { clave: 'propias', nombre: 'Tareas propias' }]
    .map((e) => ({ ...e, tareas: tareas.filter((t) => t.stage === e.clave || (e.clave === 'propias' && !etapas.some((x) => x.clave === t.stage))) }))
    .filter((g) => g.tareas.length > 0)

  if (grupos.length === 0) {
    return <p className="rounded-[14px] border border-dashed border-line-panel-strong px-4 py-6 text-center text-[13px] text-ink-mute">{filtrando ? 'Nada en este filtro.' : 'Todavía no hay tareas.'}</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {grupos.map((g) => {
        const hechas = g.tareas.filter((t) => t.estado === 'hecha').length
        const urgente = g.tareas.some((t) => t.estado === 'atrasada' || t.estado === 'semana')
        return (
          <details className="rounded-[18px] border border-line-panel bg-white px-5 py-3 shadow-card" key={g.clave} open={filtrando || urgente || g.clave === 'propias'}>
            <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-2 py-1">
              <span className="font-display text-[20px] font-light text-ink">{g.nombre}</span>
              <span className="font-mono text-[10px] tracking-[0.2em] text-ink-mute uppercase [font-variant-numeric:tabular-nums]">
                {hechas} de {g.tareas.length} hechas
              </span>
            </summary>
            <ul className="mt-2 flex flex-col">
              {g.tareas.map((t) => (
                <FilaDeTarea etapas={etapas} evento={evento} key={t.id} tarea={t} />
              ))}
            </ul>
          </details>
        )
      })}
    </div>
  )
}

/** Sumar una tarea propia. */
export function NewTaskForm({ eventId, eventSlug, etapas }: Evento & { etapas: readonly Etapa[] }) {
  const [estado, enviar, enviando] = useActionState(addTaskAction, INICIAL)
  return (
    <form action={enviar} className="flex flex-col gap-3">
      <Ocultos eventId={eventId} eventSlug={eventSlug} />
      <CamposDeTarea etapas={etapas} inicial={valoresDeTarea(undefined, estado.status === 'error' ? estado.valores : undefined)} key={estado.status === 'error' ? JSON.stringify(estado.valores) : 'base'} />
      <ActionFeedback errorsOnly state={estado} />
      {estado.status === 'success' ? <PanelAlert tone="ok">Tarea sumada.</PanelAlert> : null}
      <div>
        <SubmitButton variant="primary" pending={enviando} pendingLabel={'Sumando…'}>{'Sumar tarea'}</SubmitButton>
      </div>
    </form>
  )
}

/** El plan está vacío hasta que se pide: la plantilla de su fiesta, con un toque. */
export function SeedTasksButton({ eventId, eventSlug }: Evento) {
  const [estado, enviar, enviando] = useActionState(seedTasksAction, INICIAL)
  return (
    <form action={enviar} className="flex flex-col items-center gap-3">
      <Ocultos eventId={eventId} eventSlug={eventSlug} />
      <SubmitButton variant="primary" pending={enviando} pendingLabel={'Creando…'}>{'Crear el plan con la plantilla'}</SubmitButton>
      <ActionFeedback errorsOnly state={estado} />
    </form>
  )
}
