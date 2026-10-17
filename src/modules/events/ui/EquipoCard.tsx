'use client'

import { useActionState, useId, useState } from 'react'
import { addPorterAction, removePorterAction, type PorterActionState } from '@/app/_acciones/checkin/porter-actions'
import { addTeamMemberAction, removeTeamMemberAction, type TeamActionState } from '@/app/_acciones/events/team-actions'
import { FIELD_CLASS, Field, Iniciales, LABEL_CLASS, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { useT } from '@/shared/i18n/idioma-navegador'
import type { T } from '@/shared/i18n/t'

export type MiembroVista = {
  readonly userId: string
  readonly email: string
  /** Nombre y teléfono ya formateado; nulos si la cuenta no los tiene. */
  readonly nombre: string | null
  readonly telefono: string | null
  readonly papel: 'anfitrion' | 'coanfitrion' | 'planner'
}

export type PorteroVista = {
  readonly id: string
  readonly name: string
  readonly gate: string | null
  readonly phone: string | null
  /** Ya formateada por la página, con la zona de Bolivia. */
  readonly createdAt: string
  /** Llegadas que registró, sin las deshechas. */
  readonly registradas: number
  /** Hora de la última, ya formateada; `null` si todavía no registró ninguna. */
  readonly ultima: string | null
}

const papel = (t: T) => ({ anfitrion: t('Anfitrión, quien compró', 'Host, who bought it'), coanfitrion: t('Co-anfitrión', 'Co-host'), planner: t('Ve tareas, presupuesto, proveedores y el Día D', 'Sees tasks, budget, vendors and D-Day') }) as const

const EQUIPO_INICIAL: TeamActionState = { status: 'idle' }
const PORTERO_INICIAL: PorterActionState = { status: 'idle' }

/** `null` es sin límite. */
const cupo = (actuales: number, limite: number | null, t: T) => (limite === null ? t(`${actuales}, sin límite`, `${actuales}, no limit`) : t(`${actuales} de ${limite}`, `${actuales} of ${limite}`))

const FILA = 'flex items-center gap-3.5 border-b border-line-panel py-3.5 last:border-none'
const TARJETA = 'flex flex-col gap-3 rounded-[16px] border border-line-panel bg-tarjeta p-6'

function Cabecera({ titulo, cuenta }: { titulo: string; cuenta: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="font-display text-[24px] leading-tight font-medium">{titulo}</h2>
      <span className="text-[14px] text-ink-mute [font-variant-numeric:tabular-nums]">{cuenta}</span>
    </div>
  )
}

/**
 * El equipo del evento en dos tarjetas, como la maqueta (E29): **tu planner**, que entra al panel con su cuenta, y la
 * **recepción**, que entra sin cuenta con un enlace y un PIN el día de la fiesta. Cada una con su alta al pie.
 *
 * Ya no se suman co-anfitriones —la familia entra con la cuenta del cliente—, pero los que existían se ven y se quitan.
 * `sumaEquipo` es falso para la planner: suma recepción, pero no da acceso al panel a nadie. `porteros` es nulo si el
 * plan no trae la puerta.
 */
export function EquipoCard({
  eventId,
  eventSlug,
  sumaEquipo,
  miembros,
  topes,
  porteros,
}: {
  eventId: string
  eventSlug: string
  sumaEquipo: boolean
  miembros: readonly MiembroVista[]
  topes: { planners: number | null }
  porteros: { lista: readonly PorteroVista[]; limite: number } | null
}) {
  const t = useT()
  const [altaEquipo, sumarEquipo, sumandoEquipo] = useActionState(sinCaerse(addTeamMemberAction), EQUIPO_INICIAL)
  const [altaPortero, sumarPortero, sumandoPortero] = useActionState(sinCaerse(addPorterAction), PORTERO_INICIAL)
  const id = useId()
  const planners = miembros.filter((m) => m.papel === 'planner').length
  const plannersLlenos = topes.planners !== null && planners >= topes.planners
  const porterosLlenos = porteros === null || porteros.lista.length >= porteros.limite

  return (
    <div className="grid items-start gap-5 min-[900px]:grid-cols-2">
      <section aria-label={t('Tu planner', 'Your planner')} className={TARJETA}>
        <Cabecera cuenta={topes.planners === 0 ? t('Tu plan no lo incluye', 'Your plan doesn’t include it') : cupo(planners, topes.planners, t)} titulo={t('Tu planner', 'Your planner')} />
        {miembros.length === 0 ? null : (
          <ul className="flex flex-col">
            {miembros.map((m) => (
              <li aria-label={m.nombre ?? m.email} className={FILA} key={m.userId}>
                <Iniciales chico nombre={m.nombre ?? m.email} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-medium">{m.nombre ?? m.email}</span>
                  <span className="text-[13.5px] text-ink-mute">{[papel(t)[m.papel], m.nombre === null ? null : m.email, m.telefono].filter(Boolean).join(' · ')}</span>
                </span>
                {m.papel === 'anfitrion' || !sumaEquipo ? null : <QuitarMiembro campos={{ eventId, eventSlug, userId: m.userId, email: m.email }} nombre={m.nombre ?? m.email} />}
              </li>
            ))}
          </ul>
        )}
        {!sumaEquipo || topes.planners === 0 ? null : plannersLlenos ? (
          <p className="text-[13.5px] text-ink-mute">{t(`Tu plan admite ${topes.planners === 1 ? 'una planner' : `${topes.planners} planners`}. Quita a una para sumar otra.`, `Your plan allows ${topes.planners === 1 ? 'one planner' : `${topes.planners} planners`}. Remove one to add another.`)}</p>
        ) : (
          <form action={sumarEquipo} className="flex flex-col gap-2 pt-1">
            <input name="eventId" readOnly type="hidden" value={eventId} />
            <input name="eventSlug" readOnly type="hidden" value={eventSlug} />
            <input name="kind" readOnly type="hidden" value="planner" />
            <Field htmlFor={`${id}-email`} label={t('Correo', 'Email')}>
              <span className="flex gap-2">
                <input autoComplete="off" className={`${FIELD_CLASS} min-w-0 flex-1`} id={`${id}-email`} name="email" placeholder={t('Su correo; le llega su acceso', 'Their email; their access goes there')} required type="email" />
                <SubmitButton aria-label={t('Sumar a la planner', 'Add the planner')} pending={sumandoEquipo} pendingLabel={t('Sumando…', 'Adding…')} variant="primary">
                  {t('Sumar', 'Add')}
                </SubmitButton>
              </span>
            </Field>
            <ActionFeedback state={altaEquipo} />
            {altaEquipo.status === 'success' && altaEquipo.password ? (
              <p aria-label={t('Contraseña provisional', 'Temporary password')} className="font-codigo text-[16px] tracking-[0.08em] text-ink">
                {altaEquipo.password}
              </p>
            ) : null}
          </form>
        )}
      </section>

      <section aria-label={t('Recepción', 'Reception')} className={TARJETA}>
        {/* Sin recepción en el plan, lo dice una vez el párrafo de abajo (antes, también la cabecera). */}
        <Cabecera cuenta={porteros === null ? '' : cupo(porteros.lista.length, porteros.limite, t)} titulo={t('Recepción', 'Reception')} />
        <p className="text-[14px] text-ink-mute">{t('Entran sin cuenta, con un enlace y un PIN, solo el día de la fiesta.', 'They get in without an account, with a link and a PIN, only on the day of the party.')}</p>
        {porteros === null ? (
          <p className="text-[14px] text-ink-soft">{t('Tu plan no incluye pases con QR ni personal de recepción.', 'Your plan doesn’t include QR passes or reception staff.')}</p>
        ) : porteros.lista.length === 0 ? (
          <p className="text-[14px] text-ink-soft">{t('Aún no sumaste a nadie.', 'You haven’t added anyone yet.')}</p>
        ) : (
          <ul className="flex flex-col">
            {porteros.lista.map((portero) => (
              <li aria-label={portero.name} className={FILA} key={portero.id}>
                <Iniciales chico nombre={portero.name} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[15px] font-medium">{portero.name}</span>
                  <span className="text-[13.5px] text-ink-mute">
                    {[portero.gate ?? t('Recepción', 'Reception'), portero.phone].filter(Boolean).join(' · ')}
                    {' · '}
                    {portero.registradas === 0
                      ? t('todavía no registró llegadas', 'hasn’t recorded arrivals yet')
                      : t(`${portero.registradas} invitaci${portero.registradas === 1 ? 'ón' : 'ones'} registrada${portero.registradas === 1 ? '' : 's'}${portero.ultima === null ? '' : `, la última a las ${portero.ultima}`}`, `${portero.registradas} invitation${portero.registradas === 1 ? '' : 's'} recorded${portero.ultima === null ? '' : `, the last at ${portero.ultima}`}`)}
                  </span>
                </span>
                <QuitarPortero campos={{ eventId, eventSlug, porterId: portero.id }} nombre={portero.name} />
              </li>
            ))}
          </ul>
        )}

        {altaPortero.status === 'created' ? (
          <div className="flex flex-col gap-3 rounded-[12px] bg-pill-ok p-4" role="status">
            <p className="text-[14.5px]">
              <strong className="font-medium">{altaPortero.nombre}</strong> {t('ya puede entrar a la puerta.', 'can now access the door.')}
            </p>
            <dl className="grid gap-3 min-[560px]:grid-cols-[1fr_auto]">
              <div className="flex min-w-0 flex-col gap-1">
                <dt className={LABEL_CLASS}>{t('Enlace', 'Link')}</dt>
                <dd className="font-codigo text-[12.5px] break-all">{altaPortero.enlace}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className={LABEL_CLASS}>PIN</dt>
                <dd className="font-codigo text-[22px] tracking-[0.2em]">{altaPortero.pin}</dd>
              </div>
            </dl>
            <p className="text-[13px] text-ink-soft">{t('Cópialos ahora: el PIN no se vuelve a mostrar.', 'Copy them now: the PIN won’t be shown again.')}</p>
            {altaPortero.whatsapp === null ? null : (
              <PanelButton external href={altaPortero.whatsapp} size="sm" variant="primary">
                {t('Enviar por WhatsApp', 'Send via WhatsApp')}
              </PanelButton>
            )}
          </div>
        ) : null}

        {porteros === null ? null : porterosLlenos ? (
          <p className="text-[13.5px] text-ink-mute">{t(`Tu plan admite hasta ${porteros.limite} personas de recepción a la vez. Quita a una para sumar otra.`, `Your plan allows up to ${porteros.limite} reception staff at a time. Remove one to add another.`)}</p>
        ) : (
          <form action={sumarPortero} className="flex flex-col gap-2 pt-1">
            <input name="eventId" readOnly type="hidden" value={eventId} />
            <input name="eventSlug" readOnly type="hidden" value={eventSlug} />
            <input name="papel" readOnly type="hidden" value="portero" />
            <Field htmlFor={`${id}-nombre`} label={t('Nombre', 'Name')}>
              <span className="flex gap-2">
                <input className={`${FIELD_CLASS} min-w-0 flex-1`} id={`${id}-nombre`} maxLength={80} name="name" placeholder={t('Quién estará en la puerta', 'Who will be at the door')} required />
                <SubmitButton aria-label={t('Sumar a recepción', 'Add to reception')} pending={sumandoPortero} pendingLabel={t('Sumando…', 'Adding…')} variant="primary">
                  {t('Sumar', 'Add')}
                </SubmitButton>
              </span>
            </Field>
            <details className="text-[13.5px]">
              <summary className="flex min-h-11 cursor-pointer items-center text-ink-mute hover:text-ink">{t('WhatsApp y puerta (opcional)', 'WhatsApp and door (optional)')}</summary>
              <div className="mt-2 grid gap-3 min-[560px]:grid-cols-2">
                <Field htmlFor={`${id}-whatsapp`} label="WhatsApp">
                  <input className={FIELD_CLASS} id={`${id}-whatsapp`} inputMode="tel" name="phone" placeholder="+591 700 12345" />
                </Field>
                <Field htmlFor={`${id}-puerta`} label={t('Puerta', 'Door')}>
                  <input className={FIELD_CLASS} id={`${id}-puerta`} maxLength={40} name="gate" placeholder={t('Entrada principal', 'Main entrance')} />
                </Field>
              </div>
            </details>
            <ActionFeedback errorsOnly state={altaPortero} />
          </form>
        )}
      </section>
    </div>
  )
}

function QuitarMiembro({ campos, nombre }: { campos: Record<string, string>; nombre: string }) {
  const [estado, enviar, enviando] = useActionState(sinCaerse(removeTeamMemberAction), EQUIPO_INICIAL)
  return <Quitar campos={campos} enviando={enviando} enviar={enviar} error={estado.status === 'error' ? estado.message : null} nombre={nombre} />
}

function QuitarPortero({ campos, nombre }: { campos: Record<string, string>; nombre: string }) {
  const [estado, enviar, enviando] = useActionState(sinCaerse(removePorterAction), PORTERO_INICIAL)
  return <Quitar campos={campos} enviando={enviando} enviar={enviar} error={estado.status === 'error' ? estado.message : null} nombre={nombre} />
}

/** Quitar corta el acceso al instante: se confirma en la propia fila. */
function Quitar({
  campos,
  nombre,
  enviar,
  enviando,
  error,
}: {
  campos: Record<string, string>
  nombre: string
  enviar: (fd: FormData) => void
  enviando: boolean
  error: string | null
}) {
  const t = useT()
  const [confirmando, setConfirmando] = useState(false)
  return (
    <span className="flex flex-col items-end gap-1">
      {confirmando ? (
        <form action={enviar} className="flex items-center gap-2">
          {Object.entries(campos).map(([clave, valor]) => (
            <input key={clave} name={clave} readOnly type="hidden" value={valor} />
          ))}
          <SubmitButton pending={enviando} pendingLabel={t('Quitando…', 'Removing…')} variant="danger">
            {t('Sí, quitar', 'Yes, remove')}
          </SubmitButton>
          <PanelButton onClick={() => setConfirmando(false)}>{t('Cancelar', 'Cancel')}</PanelButton>
        </form>
      ) : (
        <button aria-label={t(`Quitar a ${nombre}`, `Remove ${nombre}`)} className="cursor-pointer text-[14px] font-medium text-gold-deep hover:underline" onClick={() => setConfirmando(true)} type="button">
          {t('Quitar', 'Remove')}
        </button>
      )}
      {error === null ? null : (
        <span className="text-[12px] text-danger-deep" role="alert">
          {error}
        </span>
      )}
    </span>
  )
}
