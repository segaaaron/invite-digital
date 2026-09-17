'use client'

import { CampoHora } from '@/shared/design/ui/panel/campos-de-fecha'
import { type ReactNode, useActionState, useId } from 'react'
import { FIELD_CLASS, Field, Pill } from '@/shared/design/ui/panel/PanelKit'
import { type DiaActionState, removeMomentAction, saveMomentAction, seedMomentsAction } from '@/app/_acciones/planner/dia-actions'
import { Accion, type Evento, Ocultos } from './Accion'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'

const INICIAL: DiaActionState = { status: 'idle' }

export type MomentoVista = {
  readonly id: string
  readonly startsAt: string
  readonly durationMin: number
  readonly title: string
  readonly place: string | null
  readonly owner: string | null
  readonly vendorIds: readonly string[]
  readonly cue: string | null
  readonly notes: string | null
  /** «Se pisa con Brindis» o «Menos de 10 min tras Brindis», ya compuesto. */
  readonly aviso: string | null
  readonly enInvitacion: boolean
  readonly icono: string | null
}

/** Un icono del diseño de la invitación, ya dibujado por la página. */
export type IconoDeMomento = { readonly clave: string; readonly nombre: string; readonly dibujo: ReactNode }

type ProveedorCorto = { id: string; service: string }

function FormularioDeMomento({
  evento,
  proveedores,
  momento,
  iconos,
}: {
  evento: Evento
  proveedores: readonly ProveedorCorto[]
  momento?: MomentoVista
  iconos: readonly IconoDeMomento[]
}) {
  const [estado, enviar, enviando] = useActionState(saveMomentAction, INICIAL)
  const id = useId()
  const e = estado.status === 'error' ? estado.valores : undefined
  const v = (campo: string, base: string | number | null | undefined) => e?.[campo] ?? (base === null || base === undefined ? '' : String(base))
  return (
    <form action={enviar} className="flex flex-col gap-3" key={e ? JSON.stringify(e) : `${momento?.enInvitacion}-${momento?.icono}`}>
      <Ocultos {...evento} extra={{ momentId: momento?.id ?? '' }} />
      <div className="grid gap-3 min-[560px]:grid-cols-3">
        <Field htmlFor={`${id}-h`} label="Hora">
          <CampoHora defaultValue={v('startsAt', momento?.startsAt)} id={`${id}-h`} name="startsAt" required />
        </Field>
        <Field htmlFor={`${id}-d`} label="Minutos">
          <input className={FIELD_CLASS} defaultValue={v('durationMin', momento?.durationMin ?? 15)} id={`${id}-d`} inputMode="numeric" name="durationMin" required />
        </Field>
        <Field htmlFor={`${id}-t`} label="Qué pasa">
          <input className={FIELD_CLASS} defaultValue={v('title', momento?.title)} id={`${id}-t`} maxLength={160} name="title" required />
        </Field>
        <Field htmlFor={`${id}-l`} label="Dónde">
          <input className={FIELD_CLASS} defaultValue={v('place', momento?.place)} id={`${id}-l`} maxLength={120} name="place" />
        </Field>
        <Field htmlFor={`${id}-r`} label="Responsable">
          <input className={FIELD_CLASS} defaultValue={v('owner', momento?.owner)} id={`${id}-r`} maxLength={120} name="owner" />
        </Field>
        <Field htmlFor={`${id}-c`} label="Canción o señal">
          <input className={FIELD_CLASS} defaultValue={v('cue', momento?.cue)} id={`${id}-c`} maxLength={200} name="cue" />
        </Field>
      </div>
      {proveedores.length === 0 ? null : (
        <fieldset className="flex flex-wrap gap-x-4 gap-y-2">
          <legend className="mb-1 font-mono text-[9px] tracking-[0.3em] text-ink-mute uppercase">Proveedores</legend>
          {proveedores.map((p) => (
            <label className="flex items-center gap-2 text-[13px] text-ink" key={p.id}>
              <input defaultChecked={momento?.vendorIds.includes(p.id) ?? false} name="vendorIds" type="checkbox" value={p.id} />
              {p.service}
            </label>
          ))}
        </fieldset>
      )}
      {/* Lo que ven los invitados sale de aquí: una sola lista de momentos. */}
      {/* Sin estado propio: React vacía el formulario al guardar y un `checked` controlado quedaba
          desmarcado con los iconos a la vista. Los iconos se enseñan por CSS con la casilla. */}
      <div className="group flex flex-col gap-3 rounded-[14px] border border-line-panel bg-bg-top/60 p-3.5">
        <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] text-ink">
          <input className="size-4 accent-ink" defaultChecked={momento?.enInvitacion ?? false} name="enInvitacion" type="checkbox" />
          Sale en la invitación
          <span className="text-[12px] text-ink-mute">— los invitados lo ven en el itinerario, con su hora</span>
        </label>
        {iconos.length > 0 ? (
          <fieldset className="hidden flex-wrap gap-2 group-has-[input[name=enInvitacion]:checked]:flex">
            <legend className="mb-2 font-mono text-[9px] tracking-[0.3em] text-ink-mute uppercase">Icono en la invitación</legend>
            {iconos.map((icono) => (
              <label
                className="flex w-[76px] cursor-pointer flex-col items-center gap-1 rounded-[12px] border border-line-panel bg-white px-1.5 py-2 text-ink has-checked:border-ink has-checked:ring-2 has-checked:ring-ink"
                key={icono.clave}
              >
                <input className="sr-only" defaultChecked={momento?.icono === icono.clave} name="icono" type="radio" value={icono.clave} />
                <span aria-hidden className="grid size-10 place-items-center [&_svg]:max-h-10 [&_svg]:max-w-10">
                  {icono.dibujo}
                </span>
                <span className="text-center text-[10.5px] leading-tight text-ink-soft">{icono.nombre}</span>
              </label>
            ))}
          </fieldset>
        ) : null}
      </div>
      <Field htmlFor={`${id}-n`} label="Notas internas">
        <textarea className={FIELD_CLASS} defaultValue={v('notes', momento?.notes)} id={`${id}-n`} maxLength={2000} name="notes" rows={2} />
      </Field>
      <ActionFeedback errorsOnly state={estado} />
      <div>
        <SubmitButton variant={momento ? 'default' : 'primary'} pending={enviando} pendingLabel={'Guardando…'}>{momento ? 'Guardar momento' : 'Sumar momento'}</SubmitButton>
      </div>
    </form>
  )
}

export function NewMomentForm(props: { evento: Evento; proveedores: readonly ProveedorCorto[]; iconos: readonly IconoDeMomento[] }) {
  return <FormularioDeMomento {...props} />
}

export function SeedMomentsButton({ evento }: { evento: Evento }) {
  return (
    <Accion action={seedMomentsAction} evento={evento} extra={{}} label="Crear el cronograma con la plantilla" variant="primary">
      Crear el cronograma con la plantilla
    </Accion>
  )
}

/** El cronograma, en orden de hora, con los avisos de solapes y márgenes cortos. */
export function RunOfShowBoard({
  evento,
  momentos,
  proveedores,
  iconos,
}: {
  evento: Evento
  momentos: readonly MomentoVista[]
  proveedores: readonly ProveedorCorto[]
  iconos: readonly IconoDeMomento[]
}) {
  const nombre = (vid: string) => proveedores.find((p) => p.id === vid)?.service
  return (
    <ol className="flex flex-col">
      {momentos.map((m) => (
        <li aria-label={`${m.startsAt} ${m.title}`} className="flex flex-col gap-2 border-b border-line-panel py-3 last:border-none" key={m.id}>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="w-14 font-mono text-[14px] text-ink [font-variant-numeric:tabular-nums]">{m.startsAt}</span>
            <span className="min-w-0 flex-1 text-[14px] text-ink">
              {m.title}
              <span className="block text-[11px] text-ink-mute">
                {[`${m.durationMin} min`, m.place, m.owner ? `a cargo de ${m.owner}` : null, m.cue ? `♪ ${m.cue}` : null, ...m.vendorIds.map(nombre)].filter(Boolean).join(' · ')}
              </span>
            </span>
            {m.enInvitacion ? (
              <span className="flex items-center gap-1.5">
                {iconos.find((i) => i.clave === m.icono) ? (
                  <span aria-hidden className="grid size-7 place-items-center [&_img]:size-7 [&_svg]:max-h-7 [&_svg]:max-w-7">
                    {iconos.find((i) => i.clave === m.icono)?.dibujo}
                  </span>
                ) : null}
                <Pill tone="ok">En la invitación</Pill>
              </span>
            ) : null}
            {m.aviso ? <Pill tone="no">{m.aviso}</Pill> : null}
          </div>
          <details className="min-[560px]:ml-18">
            <summary className="cursor-pointer text-[11px] text-ink-soft underline underline-offset-2">Editar o quitar</summary>
            <div className="mt-3 flex flex-col gap-3">
              <FormularioDeMomento evento={evento} iconos={iconos} momento={m} proveedores={proveedores} />
              <div>
                <Accion action={removeMomentAction} evento={evento} extra={{ momentId: m.id }} label={`Quitar «${m.title}»`} variant="danger">
                  Quitar momento
                </Accion>
              </div>
            </div>
          </details>
        </li>
      ))}
    </ol>
  )
}
