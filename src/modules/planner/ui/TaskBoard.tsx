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
import { useT } from '@/shared/i18n/idioma-navegador'
import type { T } from '@/shared/i18n/t'
import { traducir } from '@/shared/i18n/en-ingles'

const INICIAL: PlannerActionState = { status: 'idle' }

export const nombreResponsable = (t: T): Record<Responsable, string> => ({ anfitrion: t('Anfitriones', 'Hosts'), planner: 'Planner', familia: t('Familia', 'Family') })

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
  const t = useT()
  const id = useId()
  return (
    <div className="grid gap-3 min-[560px]:grid-cols-2">
      <Field htmlFor={`${id}-t`} label={t('Tarea', 'Task')}>
        <input className={FIELD_CLASS} defaultValue={inicial.title} id={`${id}-t`} maxLength={200} name="title" required />
      </Field>
      <Field htmlFor={`${id}-e`} label={t('Etapa', 'Stage')}>
        <select className={FIELD_CLASS} defaultValue={inicial.stage || etapas[0]?.clave} id={`${id}-e`} name="stage">
          {etapas.map((e) => (
            <option key={e.clave} value={e.clave}>
              {traducir(e.nombre, t)}
            </option>
          ))}
          <option value="propias">{t('Tareas propias', 'Own tasks')}</option>
        </select>
      </Field>
      <Field htmlFor={`${id}-f`} label={t('Vence', 'Due')}>
        <CampoFecha defaultValue={inicial.dueDate} id={`${id}-f`} name="dueDate" />
      </Field>
      <Field htmlFor={`${id}-r`} label={t('Se encarga', 'In charge')}>
        <select className={FIELD_CLASS} defaultValue={inicial.assignee} id={`${id}-r`} name="assignee">
          {(Object.keys(nombreResponsable(t)) as Responsable[]).map((r) => (
            <option key={r} value={r}>
              {nombreResponsable(t)[r]}
            </option>
          ))}
        </select>
      </Field>
    </div>
  )
}

/** La casilla de la tarea (E12): marcarla la cierra, desmarcarla la reabre. Su propio formulario. */
function Casilla({ tarea, evento }: { tarea: TareaVista; evento: Evento }) {
  const t = useT()
  const [estado, enviar, enviando] = useActionState(sinCaerse(toggleTaskAction), INICIAL)
  const hecha = tarea.estado === 'hecha'
  const titulo = traducir(tarea.title, t)
  const label = hecha ? t(`Reabrir «${tarea.title}»`, `Reopen “${titulo}”`) : t(`Marcar hecha «${tarea.title}»`, `Mark done “${titulo}”`)
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
        <span className="text-[12px] text-danger-deep" role="alert">
          {estado.message}
        </span>
      ) : null}
    </form>
  )
}

function FilaDeTarea({ tarea, evento, etapas }: { tarea: TareaVista; evento: Evento; etapas: readonly Etapa[] }) {
  const t = useT()
  const [edicion, guardar, guardando] = useActionState(sinCaerse(editTaskAction), INICIAL)
  const id = useId()
  const enviados = edicion.status === 'error' ? edicion.valores : undefined
  const extra = { taskId: tarea.id }
  const hecha = tarea.estado === 'hecha'

  return (
    <li aria-label={tarea.title} className="group/fila relative border-b border-line-panel py-3.5">
      <div className="flex items-center gap-3">
        {tarea.porLaApp ? (
          <span className="grid size-11 shrink-0 place-items-center" title={t('Resuelta en su pantalla', 'Solved on its screen')}>
            <span className="grid size-6 place-items-center rounded-[6px] bg-ink-mute text-white">
              <CheckIcon className="size-3.5" />
            </span>
          </span>
        ) : (
          <Casilla evento={evento} tarea={tarea} />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={`text-[15px] font-medium ${hecha ? 'text-ink-mute line-through' : 'text-ink'}`}>{traducir(tarea.title, t)}</span>
          <span className="text-[13.5px] text-ink-mute">
            {nombreResponsable(t)[tarea.assignee]}
            {tarea.porLaApp ? t(' · resuelta en su pantalla', ' · solved on its screen') : ''}
          </span>
        </div>
        {tarea.atajo && !hecha ? (
          <Link className="inline-flex min-h-11 shrink-0 items-center text-[14px] font-medium text-gold-deep no-underline hover:underline max-[559px]:hidden" href={tarea.atajo.href}>
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
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-[13px] text-ink-mute underline-offset-4 hover:text-ink hover:underline min-[860px]:absolute min-[860px]:right-0 min-[860px]:bottom-0 [&::-webkit-details-marker]:hidden">
            {t('Editar, mover o quitar', 'Edit, move or remove')}
          </summary>
          <div className="mt-3 flex flex-col gap-3 pb-1">
            <form action={guardar} className="flex flex-col gap-3">
              <Ocultos {...evento} extra={extra} />
              <div className="flex flex-col gap-3" key={enviados ? JSON.stringify(enviados) : 'base'}>
                <CamposDeTarea etapas={etapas} inicial={valoresDeTarea(tarea, enviados)} />
                <Field htmlFor={`${id}-n`} label={t('Notas', 'Notes')}>
                  <textarea className={FIELD_CLASS} defaultValue={valoresDeTarea(tarea, enviados).notes} id={`${id}-n`} maxLength={2000} name="notes" rows={2} />
                </Field>
              </div>
              <ActionFeedback errorsOnly state={edicion} />
              <div>
                <SubmitButton variant="default" pending={guardando} pendingLabel={t('Guardando…', 'Saving…')}>{t('Guardar tarea', 'Save task')}</SubmitButton>
              </div>
            </form>
            <div className="flex flex-wrap gap-2">
              <Accion action={moveTaskAction} evento={evento} extra={{ ...extra, dir: 'arriba' }} label={t(`Subir «${tarea.title}»`, `Move up “${traducir(tarea.title, t)}”`)}>
                {t('Subir', 'Up')}
              </Accion>
              <Accion action={moveTaskAction} evento={evento} extra={{ ...extra, dir: 'abajo' }} label={t(`Bajar «${tarea.title}»`, `Move down “${traducir(tarea.title, t)}”`)}>
                {t('Bajar', 'Down')}
              </Accion>
              <Accion action={removeTaskAction} evento={evento} extra={extra} label={t(`Quitar «${tarea.title}»`, `Remove “${traducir(tarea.title, t)}”`)} variant="danger">
                {t('Quitar', 'Remove')}
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
  const t = useT()
  const evento = { eventId, eventSlug }
  const conTareas = grupos.filter((g) => g.tareas.length > 0)

  if (conTareas.length === 0) {
    return filtrando ? (
      <EmptyState compact title={t('Nada en este filtro', 'Nothing in this filter')} />
    ) : (
      <EmptyState description={t('Suma lo que tienes que hacer antes de la fiesta, con su fecha y quién se encarga.', 'Add what you need to do before the party, with its date and who is in charge.')} icon={<CheckIcon />} title={t('Tu plan de tareas está en blanco', 'Your task plan is empty')} />
    )
  }

  return (
    <div className="flex flex-col gap-9">
      {conTareas.map((g) => (
        <section aria-label={g.titulo} key={g.clave}>
          <h2 className={`border-b border-line-panel pb-2.5 font-display text-[24px] font-medium ${g.atrasada ? 'text-danger-deep' : 'text-ink'}`}>{g.titulo}</h2>
          <ul className="flex flex-col">
            {g.tareas.map((tarea) => (
              <FilaDeTarea etapas={etapas} evento={evento} key={tarea.id} tarea={tarea} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/** Sumar una tarea propia. */
export function NewTaskForm({ eventId, eventSlug, etapas }: Evento & { etapas: readonly Etapa[] }) {
  const t = useT()
  const [estado, enviar, enviando] = useActionState(sinCaerse(addTaskAction), INICIAL)
  return (
    <form action={enviar} className="flex flex-col gap-3">
      <Ocultos eventId={eventId} eventSlug={eventSlug} />
      <CamposDeTarea etapas={etapas} inicial={valoresDeTarea(undefined, estado.status === 'error' ? estado.valores : undefined)} key={estado.status === 'error' ? JSON.stringify(estado.valores) : 'base'} />
      <ActionFeedback errorsOnly state={estado} />
      {estado.status === 'success' ? <PanelAlert tone="ok">{t('Tarea añadida.', 'Task added.')}</PanelAlert> : null}
      <div className="flex justify-end">
        <SubmitButton variant="primary" pending={enviando} pendingLabel={t('Añadiendo…', 'Adding…')}>{t('Añadir tarea', 'Add task')}</SubmitButton>
      </div>
    </form>
  )
}

/** El plan está vacío hasta que se pide: la plantilla de su fiesta, con un toque. */
export function SeedTasksButton({ eventId, eventSlug }: Evento) {
  const t = useT()
  const [estado, enviar, enviando] = useActionState(sinCaerse(seedTasksAction), INICIAL)
  return (
    <form action={enviar} className="flex flex-col items-center gap-3">
      <Ocultos eventId={eventId} eventSlug={eventSlug} />
      <SubmitButton variant="primary" pending={enviando} pendingLabel={t('Creando…', 'Creating…')}>{t('Crear el plan con la plantilla', 'Create the plan from the template')}</SubmitButton>
      <ActionFeedback errorsOnly state={estado} />
    </form>
  )
}
