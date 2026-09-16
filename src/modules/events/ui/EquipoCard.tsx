'use client'

import { useActionState, useId, useState } from 'react'
import { addPorterAction, removePorterAction, type PorterActionState } from '@/app/_acciones/checkin/porter-actions'
import { addTeamMemberAction, removeTeamMemberAction, type TeamActionState } from '@/app/_acciones/events/team-actions'
import { FIELD_CLASS, Field, LABEL_CLASS, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'

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

type Papel = 'planner' | 'portero'

const PAPEL = { anfitrion: 'Anfitrión', coanfitrion: 'Co-anfitrión', planner: 'Planner', portero: 'Recepción' } as const

const EQUIPO_INICIAL: TeamActionState = { status: 'idle' }
const PORTERO_INICIAL: PorterActionState = { status: 'idle' }

/** `null` es sin límite. */
const cupo = (actuales: number, limite: number | null) => (limite === null ? `${actuales} · sin límite` : `${actuales} de ${limite}`)

const FILA = 'flex flex-wrap items-center justify-between gap-3 px-4 py-3'

/**
 * Todo el equipo del evento en un sitio: la planner y quien recibe en la puerta.
 *
 * Se elige qué hará cada persona. La planner entra al panel con su cuenta (correo y contraseña
 * provisional); recepción no tiene cuenta: un enlace y un PIN que solo abren la puerta el día
 * del evento. Ya no se suman co-anfitriones —la familia entra con la cuenta del cliente—, pero
 * los que ya existían se ven y se pueden quitar.
 *
 * `sumaEquipo` es falso para la planner: suma recepción, pero no da acceso al panel a nadie.
 * `porteros` es nulo si el plan no trae la puerta.
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
  const [altaEquipo, sumarEquipo, sumandoEquipo] = useActionState(addTeamMemberAction, EQUIPO_INICIAL)
  const [altaPortero, sumarPortero, sumandoPortero] = useActionState(addPorterAction, PORTERO_INICIAL)
  const id = useId()
  const cuantos = (p: MiembroVista['papel']) => miembros.filter((m) => m.papel === p).length

  const porterosLlenos = porteros === null || porteros.lista.length >= porteros.limite
  const opciones: ReadonlyArray<{ value: Papel; descripcion: string; cupo: string; apagada: boolean }> = [
    ...(sumaEquipo
      ? [
          {
            value: 'planner' as const,
            descripcion: 'Entra al panel con su cuenta: invitados, planificación y proveedores, y suma personal de recepción.',
            cupo: topes.planners === 0 ? 'tu plan no lo incluye' : cupo(cuantos('planner'), topes.planners),
            apagada: topes.planners !== null && cuantos('planner') >= topes.planners,
          },
        ]
      : []),
    {
      value: 'portero',
      descripcion: 'Sin cuenta: un enlace y un PIN para registrar la entrada de los invitados el día del evento.',
      cupo: porteros === null ? 'tu plan no lo incluye' : cupo(porteros.lista.length, porteros.limite),
      apagada: porterosLlenos,
    },
  ]
  const primera = opciones.find((o) => !o.apagada)?.value ?? opciones[0]!.value
  const [papel, setPapel] = useState<Papel>(primera)
  const elegida = opciones.find((o) => o.value === papel)
  const esPortero = papel === 'portero'
  const apagada = elegida?.apagada ?? true

  const vacio = miembros.length === 0 && (porteros === null || porteros.lista.length === 0)

  return (
    <div className="flex flex-col gap-6">
      {vacio ? (
        <p className="rounded-[14px] border border-dashed border-line-panel-strong px-4 py-6 text-center text-[13px] text-ink-mute">
          Todavía no sumaste a nadie.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-line-panel rounded-[14px] border border-line-panel bg-white">
          {miembros.map((m) => (
            <li aria-label={m.nombre ?? m.email} className={FILA} key={m.userId}>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[14px] text-ink">{m.nombre ?? m.email}</span>
                <span className="text-[12px] text-ink-mute">
                  {[m.papel === 'anfitrion' ? 'Anfitrión · quien compró' : PAPEL[m.papel], m.nombre === null ? null : m.email, m.telefono]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              {m.papel === 'anfitrion' || !sumaEquipo ? null : (
                <QuitarMiembro campos={{ eventId, eventSlug, userId: m.userId, email: m.email }} nombre={m.nombre ?? m.email} />
              )}
            </li>
          ))}
          {porteros?.lista.map((portero) => (
            <li aria-label={portero.name} className={FILA} key={portero.id}>
              <span className="flex min-w-0 flex-col">
                <span className="text-[14px] text-ink">{portero.name}</span>
                <span className="text-[12px] text-ink-mute">
                  {['Recepción', portero.gate, portero.phone, `sumado el ${portero.createdAt}`].filter(Boolean).join(' · ')}
                </span>
                <span className="text-[12px] text-ink-soft">
                  {portero.registradas === 0
                    ? 'Todavía no registró llegadas'
                    : `${portero.registradas} invitaci${portero.registradas === 1 ? 'ón' : 'ones'} registrada${portero.registradas === 1 ? '' : 's'}${portero.ultima === null ? '' : ` · el último a las ${portero.ultima}`}`}
                </span>
              </span>
              <QuitarPortero campos={{ eventId, eventSlug, porterId: portero.id }} nombre={portero.name} />
            </li>
          ))}
        </ul>
      )}

      {altaPortero.status === 'created' ? (
        <div className="flex flex-col gap-3 rounded-[14px] border border-sage/40 bg-sage/8 p-4" role="status">
          <p className="text-[14px] text-ink">
            <strong className="font-medium">{altaPortero.nombre}</strong> ya puede entrar a la puerta.
          </p>
          <dl className="grid gap-3 min-[560px]:grid-cols-[1fr_auto]">
            <div className="flex min-w-0 flex-col gap-1">
              <dt className={LABEL_CLASS}>Enlace</dt>
              <dd className="font-mono text-[12px] break-all text-ink">{altaPortero.enlace}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className={LABEL_CLASS}>PIN</dt>
              <dd className="font-mono text-[22px] tracking-[0.2em] text-ink">{altaPortero.pin}</dd>
            </div>
          </dl>
          <p className="text-[12px] text-ink-soft">Cópialos ahora: el PIN no se vuelve a mostrar.</p>
          {altaPortero.whatsapp === null ? null : (
            <PanelButton external href={altaPortero.whatsapp} variant="primary">
              Enviar por WhatsApp
            </PanelButton>
          )}
        </div>
      ) : null}

      <form action={esPortero ? sumarPortero : sumarEquipo} className="flex flex-col gap-4 rounded-[16px] border border-line-panel bg-bg-raised p-4">
        <input name="eventId" readOnly type="hidden" value={eventId} />
        <input name="eventSlug" readOnly type="hidden" value={eventSlug} />
        <fieldset className="flex flex-col gap-2">
          <legend className={`${LABEL_CLASS} mb-2`}>Qué hará</legend>
          <div className={`grid gap-2 ${opciones.length > 1 ? 'min-[700px]:grid-cols-3' : ''}`}>
            {opciones.map((o) => (
              <label
                className="flex cursor-pointer flex-col gap-1 rounded-[14px] border border-line-panel-strong bg-white p-3.5 transition-colors has-checked:border-ink has-checked:bg-bg-top has-disabled:cursor-not-allowed has-disabled:opacity-55 has-focus-visible:outline-2 has-focus-visible:outline-gold"
                key={o.value}
              >
                <span className="flex items-center justify-between gap-2 text-[13.5px] text-ink">
                  <span className="flex items-center gap-2">
                    <input
                      checked={papel === o.value}
                      className="accent-ink"
                      disabled={o.apagada && papel !== o.value}
                      name={esPortero ? 'papel' : 'kind'}
                      onChange={() => setPapel(o.value)}
                      type="radio"
                      value={o.value}
                    />
                    {PAPEL[o.value]}
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.08em] text-ink-mute [font-variant-numeric:tabular-nums]">{o.cupo}</span>
                </span>
                <span className="pl-5 text-[12px] leading-[1.5] text-ink-mute">{o.descripcion}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {esPortero ? (
          <div className="grid gap-3 min-[700px]:grid-cols-3">
            <Field htmlFor={`${id}-nombre`} label="Nombre">
              <input className={FIELD_CLASS} disabled={apagada} id={`${id}-nombre`} maxLength={80} name="name" placeholder="Carlos Mendoza" required />
            </Field>
            <Field htmlFor={`${id}-whatsapp`} label="WhatsApp (opcional)">
              <input className={FIELD_CLASS} disabled={apagada} id={`${id}-whatsapp`} inputMode="tel" name="phone" placeholder="+591 700 12345" />
            </Field>
            <Field htmlFor={`${id}-puerta`} label="Puerta (opcional)">
              <input className={FIELD_CLASS} disabled={apagada} id={`${id}-puerta`} maxLength={40} name="gate" placeholder="Entrada principal" />
            </Field>
          </div>
        ) : (
          <Field htmlFor={`${id}-email`} label="Correo">
            <input autoComplete="off" className={FIELD_CLASS} disabled={apagada} id={`${id}-email`} name="email" required type="email" />
          </Field>
        )}

        {porteros === null ? <p className="text-[12px] text-ink-mute">Tu plan no incluye pases con QR ni personal de recepción.</p> : null}
        {esPortero && porteros !== null && porterosLlenos ? (
          <p className="text-[12px] text-ink-mute">Tu plan admite hasta {porteros.limite} personas de recepción a la vez. Quita a una para sumar otra.</p>
        ) : null}

        {esPortero ? <ActionFeedback errorsOnly state={altaPortero} /> : <ActionFeedback state={altaEquipo} />}
        {!esPortero && altaEquipo.status === 'success' && altaEquipo.password ? (
          <p aria-label="Contraseña provisional" className="font-mono text-[15px] tracking-[0.08em] text-ink">
            {altaEquipo.password}
          </p>
        ) : null}
        <div>
          <SubmitButton disabled={apagada} pending={esPortero ? sumandoPortero : sumandoEquipo} pendingLabel="Sumando…" variant="primary">
            Sumar al equipo
          </SubmitButton>
        </div>
      </form>
    </div>
  )
}

function QuitarMiembro({ campos, nombre }: { campos: Record<string, string>; nombre: string }) {
  const [estado, enviar, enviando] = useActionState(removeTeamMemberAction, EQUIPO_INICIAL)
  return <Quitar campos={campos} enviando={enviando} enviar={enviar} error={estado.status === 'error' ? estado.message : null} nombre={nombre} />
}

function QuitarPortero({ campos, nombre }: { campos: Record<string, string>; nombre: string }) {
  const [estado, enviar, enviando] = useActionState(removePorterAction, PORTERO_INICIAL)
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
  const [confirmando, setConfirmando] = useState(false)
  return (
    <span className="flex flex-col items-end gap-1">
      {confirmando ? (
        <form action={enviar} className="flex items-center gap-2">
          {Object.entries(campos).map(([clave, valor]) => (
            <input key={clave} name={clave} readOnly type="hidden" value={valor} />
          ))}
          <SubmitButton pending={enviando} pendingLabel="Quitando…" variant="danger">
            Sí, quitar
          </SubmitButton>
          <PanelButton onClick={() => setConfirmando(false)}>Cancelar</PanelButton>
        </form>
      ) : (
        <PanelButton aria-label={`Quitar a ${nombre}`} onClick={() => setConfirmando(true)} variant="danger">
          Quitar
        </PanelButton>
      )}
      {error === null ? null : (
        <span className="text-[11px] text-danger-deep" role="alert">
          {error}
        </span>
      )}
    </span>
  )
}
