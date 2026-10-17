'use client'

import Link from 'next/link'
import { UsersIcon, WhatsAppIcon } from '@/shared/design/ui/icons'
import { CampoFechaYHora } from '@/shared/design/ui/panel/campos-de-fecha'
import { useActionState, useId } from 'react'
import { FIELD_CLASS, Field, Iniciales, PanelAlert, PanelButton, Pill, TARJETA_DESTACADA } from '@/shared/design/ui/panel/PanelKit'
import { type DiaActionState, removeCourtMemberAction, removeRehearsalAction, saveCourtMemberAction, saveRehearsalAction, setCourtConfirmedAction } from '@/app/_acciones/planner/dia-actions'
import { nombreDelCortejo, type TipoDeCortejo } from '../domain/equipo-del-dia'
import { Accion, type Evento, Ocultos } from './Accion'
import { ActionFeedback, SubmitButton, EmptyState } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { useT } from '@/shared/i18n/idioma-navegador'
import { traducir } from '@/shared/i18n/en-ingles'

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
  const t = useT()
  const [estado, enviar, enviando] = useActionState(sinCaerse(saveCourtMemberAction), INICIAL)
  const id = useId()
  const e = estado.status === 'error' ? estado.valores : undefined
  const v = (campo: string, base: string | null | undefined) => e?.[campo] ?? base ?? ''
  return (
    <form action={enviar} className="flex flex-col gap-3" key={e ? JSON.stringify(e) : 'base'}>
      <Ocultos {...evento} extra={{ memberId: miembro?.id ?? '' }} />
      <div className="grid gap-3 min-[560px]:grid-cols-2">
        <Field htmlFor={`${id}-k`} label={t('Papel', 'Role')}>
          <select className={FIELD_CLASS} defaultValue={v('kind', miembro?.kind ?? tipos[0])} id={`${id}-k`} name="kind">
            {tipos.map((tipo) => (
              <option key={tipo} value={tipo}>
                {traducir(nombreDelCortejo(tipo), t)}
              </option>
            ))}
          </select>
        </Field>
        <Field htmlFor={`${id}-n`} label={t('Nombre', 'Name')}>
          <input className={FIELD_CLASS} defaultValue={v('name', miembro?.name)} id={`${id}-n`} maxLength={120} name="name" required />
        </Field>
        <Field htmlFor={`${id}-w`} label="WhatsApp">
          <input className={FIELD_CLASS} defaultValue={v('whatsapp', miembro?.whatsapp)} id={`${id}-w`} inputMode="tel" name="whatsapp" />
        </Field>
        <Field htmlFor={`${id}-s`} label={t('Qué apadrina', 'What they sponsor')}>
          <input className={FIELD_CLASS} defaultValue={v('sponsors', miembro?.sponsors)} id={`${id}-s`} maxLength={200} name="sponsors" placeholder={ejemplo} />
        </Field>
        <Field htmlFor={`${id}-t`} label={t('Talla', 'Size')}>
          <input className={FIELD_CLASS} defaultValue={v('size', miembro?.size)} id={`${id}-t`} maxLength={20} name="size" />
        </Field>
        <Field htmlFor={`${id}-p`} label={t('Su partida del presupuesto', 'Their budget line item')}>
          <select className={FIELD_CLASS} defaultValue={v('budgetItemId', miembro?.budgetItemId)} id={`${id}-p`} name="budgetItemId">
            <option value="">{t('Ninguna', 'None')}</option>
            {partidas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.concept}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <ActionFeedback errorsOnly state={estado} />
      <div className="flex justify-end">
        <SubmitButton variant={miembro ? 'default' : 'primary'} pending={enviando} pendingLabel={t('Guardando…', 'Saving…')}>{miembro ? t('Guardar', 'Save') : t('Sumar al cortejo', 'Add to the wedding party')}</SubmitButton>
      </div>
    </form>
  )
}

/** `ejemplo`: lo que se apadrina en esa fiesta (`Vocabulario.ejemplos.apadrina`). */
export function NewCourtMemberForm(props: { evento: Evento; tipos: readonly TipoDeCortejo[]; partidas: readonly Partida[]; ejemplo: string }) {
  return <FormularioDeMiembro {...props} />
}

/** Los grupos de la maqueta (E26): padrinos; damas y caballeros juntos; en XV, chambelanes y la corte. */
const GRUPOS: readonly { titulo: string; tipos: readonly TipoDeCortejo[] }[] = [
  { titulo: 'Padrinos', tipos: ['padrino'] },
  { titulo: 'Damas y caballeros', tipos: ['dama', 'caballero'] },
  { titulo: 'Chambelanes', tipos: ['chambelan'] },
  { titulo: 'Corte de honor', tipos: ['corte'] },
]

/** El cortejo por grupo (E26): iniciales, nombre y lo que apadrina, su teléfono y «Editar». */
export function CourtBoard({ miembros, editarEn, nuevoHref }: { miembros: readonly MiembroVista[]; /** `…?miembro=`: se le suma el id. */ editarEn: string; /** Sumar la primera persona desde el vacío. */ nuevoHref?: string }) {
  const t = useT()
  if (miembros.length === 0) {
    return (
      <EmptyState
        action={nuevoHref === undefined ? undefined : <PanelButton href={nuevoHref} variant="primary">{t('Añadir la primera persona', 'Add the first person')}</PanelButton>}
        description={t('Padrinos, damas, chambelanes: con su papel, su talla y su teléfono, y los ensayos a los que vienen.', 'Sponsors, bridesmaids, chambelanes: with their role, size and phone, and the rehearsals they attend.')}
        icon={<UsersIcon />}
        title={t('Tu cortejo todavía no tiene a nadie', 'Your wedding party has no one yet')}
      />
    )
  }
  return (
    <div className="flex flex-col gap-9">
      {GRUPOS.map((g) => ({ ...g, gente: miembros.filter((m) => g.tipos.includes(m.kind)) }))
        .filter((g) => g.gente.length > 0)
        .map((g) => (
          <section aria-label={traducir(g.titulo, t)} key={g.titulo}>
            <h2 className="border-b border-line-panel pb-2.5 font-display text-[24px] font-medium">{traducir(g.titulo, t)}</h2>
            <ul>
              {g.gente.map((m) => (
                <li aria-label={m.name} className="relative flex items-center gap-4 border-b border-line-panel py-3.5" key={m.id}>
                  <Iniciales chico nombre={m.name} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[15px] font-medium text-ink">{m.name}</span>
                    <span className="text-[13.5px] text-ink-mute">
                      {[m.sponsors ?? traducir(nombreDelCortejo(m.kind), t), m.size ? t(`talla ${m.size}`, `size ${m.size}`) : null, m.partida ? t(`partida: ${m.partida}`, `line item: ${m.partida}`) : null, m.confirmed ? null : t('por confirmar', 'to be confirmed')].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  {m.whatsappHref ? (
                    <a className="relative z-10 text-[14px] text-ink no-underline [font-variant-numeric:tabular-nums] hover:text-gold-deep max-[559px]:hidden" href={m.whatsappHref} rel="noopener noreferrer" target="_blank">
                      {m.whatsapp?.replace(/^\+591(?=\d)/, '+591 ')}
                    </a>
                  ) : null}
                  <Link aria-label={t(`Editar a ${m.name}`, `Edit ${m.name}`)} className="text-[14px] font-medium text-gold-deep no-underline after:absolute after:inset-0 hover:underline min-[560px]:ml-4" href={`${editarEn}${m.id}`} scroll={false}>
                    {t('Editar', 'Edit')}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  )
}

/** «Editar» de una persona del cortejo (diálogo): confirmarla, escribirle, sus datos y quitarla. */
export function EditarMiembro({ evento, tipos, partidas, miembro }: { evento: Evento; tipos: readonly TipoDeCortejo[]; partidas: readonly Partida[]; miembro: MiembroVista }) {
  const t = useT()
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <Pill tone={miembro.confirmed ? 'ok' : 'pending'}>{miembro.confirmed ? t('Confirmado', 'Confirmed') : t('Por confirmar', 'To be confirmed')}</Pill>
        <Accion action={setCourtConfirmedAction} evento={evento} extra={{ memberId: miembro.id, confirmed: String(!miembro.confirmed) }} label={miembro.confirmed ? t(`Desmarcar a ${miembro.name}`, `Unmark ${miembro.name}`) : t(`Confirmar a ${miembro.name}`, `Confirm ${miembro.name}`)}>
          {miembro.confirmed ? t('Desmarcar', 'Unmark') : t('Confirmar', 'Confirm')}
        </Accion>
        {miembro.whatsappHref ? (
          <PanelButton external href={miembro.whatsappHref}>
            WhatsApp
          </PanelButton>
        ) : null}
      </div>
      <FormularioDeMiembro evento={evento} miembro={miembro} partidas={partidas} tipos={tipos} />
      <div className="border-t border-line-panel pt-4">
        <Accion action={removeCourtMemberAction} evento={evento} extra={{ memberId: miembro.id }} label={t(`Quitar a ${miembro.name}`, `Remove ${miembro.name}`)} variant="danger">
          {t('Quitar del cortejo', 'Remove from the wedding party')}
        </Accion>
      </div>
    </div>
  )
}

/**
 * El próximo ensayo en su tarjeta (E26): cuándo, dónde, cuántos vienen y quién falta confirmar, con «Avisar al cortejo»
 * por WhatsApp. Debajo, los demás.
 */
export function ProximoEnsayo({ evento, ensayos, miembros, avisar }: { evento: Evento; ensayos: readonly EnsayoVista[]; miembros: readonly MiembroVista[]; avisar: string | null }) {
  const t = useT()
  const [primero, ...resto] = ensayos
  if (primero === undefined) return null
  const faltan = miembros.filter((m) => !m.confirmed).map((m) => m.name)
  return (
    <div className="flex flex-col gap-4">
      <section aria-label={t('Próximo ensayo', 'Next rehearsal')} className={`${TARJETA_DESTACADA} flex flex-col items-start gap-2 px-6 py-5`}>
        <Pill tone="vip">{t('Próximo ensayo', 'Next rehearsal')}</Pill>
        <p className="mt-1 font-display text-[26px] leading-tight font-medium">{primero.cuando}</p>
        {primero.place ? <p className="text-[14.5px] text-ink-soft">{primero.place}</p> : null}
        <p className="text-[14px] text-ink-soft">
          {miembros.length === 0 ? null : t(`Vienen ${primero.asistentes.length} de ${miembros.length}.`, `${primero.asistentes.length} of ${miembros.length} coming.`)}
          {faltan.length === 0 ? '' : t(` Falta confirmar ${faltan.slice(0, 2).join(' y ')}${faltan.length > 2 ? ` y ${faltan.length - 2} más` : ''}.`, ` Still to confirm: ${faltan.slice(0, 2).join(' and ')}${faltan.length > 2 ? ` and ${faltan.length - 2} more` : ''}.`)}
        </p>
        <span className="mt-2 flex flex-wrap items-center gap-2">
          {avisar ? (
            <PanelButton external href={avisar} size="sm">
              <WhatsAppIcon className="size-4" /> {t('Avisar al cortejo', 'Notify the wedding party')}
            </PanelButton>
          ) : null}
          <Accion action={removeRehearsalAction} evento={evento} extra={{ rehearsalId: primero.id }} label={t(`Quitar el ensayo del ${primero.cuando}`, `Remove the ${primero.cuando} rehearsal`)} variant="danger">
            {t('Quitar', 'Remove')}
          </Accion>
        </span>
      </section>
      {resto.length === 0 ? null : (
        <ul aria-label={t('Más ensayos', 'More rehearsals')} className="flex flex-col">
          {resto.map((x) => (
            <li className="flex items-center justify-between gap-3 border-b border-line-panel py-2.5" key={x.id}>
              <span className="flex min-w-0 flex-col text-[14px]">
                {x.cuando}
                <span className="text-[13px] text-ink-mute">{x.place ?? t('Sin lugar', 'No place')}</span>
              </span>
              <Accion action={removeRehearsalAction} evento={evento} extra={{ rehearsalId: x.id }} label={t(`Quitar el ensayo del ${x.cuando}`, `Remove the ${x.cuando} rehearsal`)} variant="danger">
                {t('Quitar', 'Remove')}
              </Accion>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Sumar un ensayo (diálogo): cuándo, dónde y quién viene. */
export function NuevoEnsayoForm({ evento, miembros }: { evento: Evento; miembros: readonly MiembroVista[] }) {
  const t = useT()
  const [estado, enviar, enviando] = useActionState(sinCaerse(saveRehearsalAction), INICIAL)
  const id = useId()
  const e = estado.status === 'error' ? estado.valores : undefined
  return (
    <div className="flex flex-col gap-4">
      <form action={enviar} className="flex flex-col gap-4" key={e ? JSON.stringify(e) : 'base'}>
        <Ocultos {...evento} />
        <div className="grid gap-3 min-[560px]:grid-cols-2">
          <Field htmlFor={`${id}-f`} label={t('Fecha y hora', 'Date and time')}>
            <CampoFechaYHora defaultValue={e?.date ?? ''} id={`${id}-f`} name="date" required />
          </Field>
          <Field htmlFor={`${id}-l`} label={t('Lugar', 'Place')}>
            <input className={FIELD_CLASS} defaultValue={e?.place ?? ''} id={`${id}-l`} maxLength={120} name="place" />
          </Field>
        </div>
        {miembros.length === 0 ? null : (
          <fieldset className="flex flex-wrap gap-x-4 gap-y-2">
            <legend className="mb-1.5 text-[14px] font-medium">{t('Quién viene', 'Who is coming')}</legend>
            {miembros.map((m) => (
              <label className="flex items-center gap-2 text-[13px] text-ink" key={m.id}>
                <input name="asistentes" type="checkbox" value={m.id} />
                {m.name}
              </label>
            ))}
          </fieldset>
        )}
        <Field htmlFor={`${id}-n`} label={t('Notas', 'Notes')}>
          <input className={FIELD_CLASS} defaultValue={e?.notes ?? ''} id={`${id}-n`} maxLength={2000} name="notes" />
        </Field>
        <ActionFeedback errorsOnly state={estado} />
        {estado.status === 'success' ? <PanelAlert tone="ok">{t('Ensayo sumado.', 'Rehearsal added.')}</PanelAlert> : null}
        <div className="flex justify-end">
          <SubmitButton variant="primary" pending={enviando} pendingLabel={t('Guardando…', 'Saving…')}>{t('Sumar ensayo', 'Add rehearsal')}</SubmitButton>
        </div>
      </form>
    </div>
  )
}
