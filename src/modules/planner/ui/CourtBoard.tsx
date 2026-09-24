'use client'

import { UsersIcon } from '@/shared/design/ui/icons'
import { CampoFechaYHora } from '@/shared/design/ui/panel/campos-de-fecha'
import { useActionState, useId } from 'react'
import { FIELD_CLASS, Field, PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { type DiaActionState, removeCourtMemberAction, removeRehearsalAction, saveCourtMemberAction, saveRehearsalAction, setCourtConfirmedAction } from '@/app/_acciones/planner/dia-actions'
import { nombreDelCortejo, type TipoDeCortejo } from '../domain/equipo-del-dia'
import { Accion, type Evento, Ocultos } from './Accion'
import { ActionFeedback, SubmitButton, EmptyState } from '@/shared/design/ui/panel/estados'

const INICIAL: DiaActionState = { status: 'idle' }

export type MiembroVista = {
  readonly id: string
  readonly kind: TipoDeCortejo
  readonly name: string
  readonly whatsapp: string | null
  readonly whatsappHref: string | null
  readonly sponsors: string | null
  readonly size: string | null
  readonly confirmed: boolean
  readonly budgetItemId: string | null
  /** El concepto de su partida, si lo que apadrina está en el presupuesto. */
  readonly partida: string | null
}

export type EnsayoVista = { readonly id: string; readonly cuando: string; readonly place: string | null; readonly notes: string | null; readonly asistentes: readonly string[] }

type Partida = { id: string; concept: string }

function FormularioDeMiembro({ evento, tipos, partidas, miembro, ejemplo }: { evento: Evento; tipos: readonly TipoDeCortejo[]; partidas: readonly Partida[]; miembro?: MiembroVista; ejemplo?: string }) {
  const [estado, enviar, enviando] = useActionState(saveCourtMemberAction, INICIAL)
  const id = useId()
  const e = estado.status === 'error' ? estado.valores : undefined
  const v = (campo: string, base: string | null | undefined) => e?.[campo] ?? base ?? ''
  return (
    <form action={enviar} className="flex flex-col gap-3" key={e ? JSON.stringify(e) : 'base'}>
      <Ocultos {...evento} extra={{ memberId: miembro?.id ?? '' }} />
      <div className="grid gap-3 min-[560px]:grid-cols-3">
        <Field htmlFor={`${id}-k`} label="Papel">
          <select className={FIELD_CLASS} defaultValue={v('kind', miembro?.kind ?? tipos[0])} id={`${id}-k`} name="kind">
            {tipos.map((t) => (
              <option key={t} value={t}>
                {nombreDelCortejo(t)}
              </option>
            ))}
          </select>
        </Field>
        <Field htmlFor={`${id}-n`} label="Nombre">
          <input className={FIELD_CLASS} defaultValue={v('name', miembro?.name)} id={`${id}-n`} maxLength={120} name="name" required />
        </Field>
        <Field htmlFor={`${id}-w`} label="WhatsApp">
          <input className={FIELD_CLASS} defaultValue={v('whatsapp', miembro?.whatsapp)} id={`${id}-w`} inputMode="tel" name="whatsapp" />
        </Field>
        <Field htmlFor={`${id}-s`} label="Qué apadrina">
          <input className={FIELD_CLASS} defaultValue={v('sponsors', miembro?.sponsors)} id={`${id}-s`} maxLength={200} name="sponsors" placeholder={ejemplo} />
        </Field>
        <Field htmlFor={`${id}-t`} label="Talla">
          <input className={FIELD_CLASS} defaultValue={v('size', miembro?.size)} id={`${id}-t`} maxLength={20} name="size" />
        </Field>
        <Field htmlFor={`${id}-p`} label="Su partida del presupuesto">
          <select className={FIELD_CLASS} defaultValue={v('budgetItemId', miembro?.budgetItemId)} id={`${id}-p`} name="budgetItemId">
            <option value="">Ninguna</option>
            {partidas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.concept}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <ActionFeedback errorsOnly state={estado} />
      <div>
        <SubmitButton variant={miembro ? 'default' : 'primary'} pending={enviando} pendingLabel={'Guardando…'}>{miembro ? 'Guardar' : 'Sumar al cortejo'}</SubmitButton>
      </div>
    </form>
  )
}

/** `ejemplo`: lo que se apadrina en esa fiesta (`Vocabulario.ejemplos.apadrina`). */
export function NewCourtMemberForm(props: { evento: Evento; tipos: readonly TipoDeCortejo[]; partidas: readonly Partida[]; ejemplo: string }) {
  return <FormularioDeMiembro {...props} />
}

/** El cortejo por papel, con confirmado, contacto y lo que apadrina cada uno. */
export function CourtBoard({ evento, tipos, partidas, miembros }: { evento: Evento; tipos: readonly TipoDeCortejo[]; partidas: readonly Partida[]; miembros: readonly MiembroVista[] }) {
  if (miembros.length === 0) {
    return (
      <EmptyState
        description="Padrinos, damas, chambelanes: con su papel, su talla y su teléfono, y los ensayos a los que vienen."
        icon={<UsersIcon />}
        title="Tu cortejo todavía no tiene a nadie"
      />
    )
  }
  return (
    <div className="flex flex-col gap-4">
      {tipos
        .map((t) => ({ t, gente: miembros.filter((m) => m.kind === t) }))
        .filter((g) => g.gente.length > 0)
        .map(({ t, gente }) => (
          <section className="rounded-[18px] border border-line-panel bg-white px-5 py-3 shadow-card" key={t}>
            <h3 className="py-1 font-display text-[20px] font-light text-ink">
              {nombreDelCortejo(t)} · {gente.filter((g) => g.confirmed).length} de {gente.length} confirmados
            </h3>
            <ul className="flex flex-col">
              {gente.map((m) => (
                <li aria-label={m.name} className="flex flex-col gap-2 border-b border-line-panel py-3 last:border-none" key={m.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="flex min-w-0 flex-col">
                      <span className="text-[14px] text-ink">{m.name}</span>
                      <span className="text-[11px] text-ink-mute">{[m.sponsors, m.size ? `talla ${m.size}` : null, m.partida ? `partida: ${m.partida}` : null].filter(Boolean).join(' · ') || '—'}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      <Pill tone={m.confirmed ? 'ok' : 'pending'}>{m.confirmed ? 'Confirmado' : 'Por confirmar'}</Pill>
                      <Accion action={setCourtConfirmedAction} evento={evento} extra={{ memberId: m.id, confirmed: String(!m.confirmed) }} label={m.confirmed ? `Desmarcar a ${m.name}` : `Confirmar a ${m.name}`}>
                        {m.confirmed ? 'Desmarcar' : 'Confirmar'}
                      </Accion>
                      {m.whatsappHref ? (
                        <PanelButton external href={m.whatsappHref}>
                          WhatsApp
                        </PanelButton>
                      ) : null}
                    </span>
                  </div>
                  <details>
                    <summary className="cursor-pointer text-[11px] text-ink-soft underline underline-offset-2">Editar o quitar</summary>
                    <div className="mt-3 flex flex-col gap-3">
                      <FormularioDeMiembro evento={evento} miembro={m} partidas={partidas} tipos={tipos} />
                      <div>
                        <Accion action={removeCourtMemberAction} evento={evento} extra={{ memberId: m.id }} label={`Quitar a ${m.name}`} variant="danger">
                          Quitar
                        </Accion>
                      </div>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  )
}

/** Los ensayos —el vals, la entrada— con quién asiste. */
export function RehearsalsBoard({ evento, miembros, ensayos }: { evento: Evento; miembros: readonly MiembroVista[]; ensayos: readonly EnsayoVista[] }) {
  const [estado, enviar, enviando] = useActionState(saveRehearsalAction, INICIAL)
  const id = useId()
  const e = estado.status === 'error' ? estado.valores : undefined
  return (
    <div className="flex flex-col gap-4">
      {ensayos.length === 0 ? (
        <p className="text-[13px] text-ink-mute">Sin ensayos todavía.</p>
      ) : (
        <ul className="flex flex-col">
          {ensayos.map((x) => (
            <li className="flex flex-wrap items-start justify-between gap-3 border-b border-line-panel py-3 last:border-none" key={x.id}>
              <span className="flex min-w-0 flex-col">
                <span className="text-[14px] text-ink">
                  {x.cuando}
                  {x.place ? ` · ${x.place}` : ''}
                </span>
                <span className="text-[11px] text-ink-mute">
                  {x.asistentes.length === 0 ? 'Sin asistentes marcados' : x.asistentes.map((a) => miembros.find((m) => m.id === a)?.name).filter(Boolean).join(', ')}
                  {x.notes ? ` · ${x.notes}` : ''}
                </span>
              </span>
              <Accion action={removeRehearsalAction} evento={evento} extra={{ rehearsalId: x.id }} label={`Quitar el ensayo del ${x.cuando}`} variant="danger">
                Quitar
              </Accion>
            </li>
          ))}
        </ul>
      )}
      <form action={enviar} className="flex flex-col gap-3 rounded-[16px] border border-line-panel bg-bg-raised p-4" key={e ? JSON.stringify(e) : 'base'}>
        <Ocultos {...evento} />
        <div className="grid gap-3 min-[560px]:grid-cols-2">
          <Field htmlFor={`${id}-f`} label="Fecha y hora">
            <CampoFechaYHora defaultValue={e?.date ?? ''} id={`${id}-f`} name="date" required />
          </Field>
          <Field htmlFor={`${id}-l`} label="Lugar">
            <input className={FIELD_CLASS} defaultValue={e?.place ?? ''} id={`${id}-l`} maxLength={120} name="place" />
          </Field>
        </div>
        {miembros.length === 0 ? null : (
          <fieldset className="flex flex-wrap gap-x-4 gap-y-2">
            <legend className="mb-1 font-mono text-[9px] tracking-[0.3em] text-ink-mute uppercase">Quién asiste</legend>
            {miembros.map((m) => (
              <label className="flex items-center gap-2 text-[13px] text-ink" key={m.id}>
                <input name="asistentes" type="checkbox" value={m.id} />
                {m.name}
              </label>
            ))}
          </fieldset>
        )}
        <Field htmlFor={`${id}-n`} label="Notas">
          <input className={FIELD_CLASS} defaultValue={e?.notes ?? ''} id={`${id}-n`} maxLength={2000} name="notes" />
        </Field>
        <ActionFeedback errorsOnly state={estado} />
        <div>
          <SubmitButton variant="default" pending={enviando} pendingLabel={'Guardando…'}>{'Sumar ensayo'}</SubmitButton>
        </div>
      </form>
    </div>
  )
}
