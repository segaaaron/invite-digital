'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useId } from 'react'
import { type AgendaActionState, emitirSuscripcionAction, marcarEnLaAgendaAction, removeCitaAction, reprogramarEnLaAgendaAction, saveCitaAction } from '@/app/_acciones/planner/agenda-actions'
import { CopyLinkButton } from '@/shared/design/ui/CopyLinkButton'
import { CampoFecha, CampoHora } from '@/shared/design/ui/panel/campos-de-fecha'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { PanelDialog } from '@/shared/design/ui/panel/PanelDialog'
import { FIELD_CLASS, Field, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import type { Cita, EntradaDeAgenda } from '../domain/agenda'
import { Accion, type Evento, Ocultos } from './Accion'
import { useT } from '@/shared/i18n/idioma-navegador'
import { traducir } from '@/shared/i18n/en-ingles'

const INICIAL: AgendaActionState = { status: 'idle' }

/** Nueva cita o su edición (`?cita=nueva|<id>`). */
export function CitaDialog({ evento, cita, dia, proveedores, cerrarEn }: { evento: Evento; cita?: Cita | undefined; dia: string; proveedores: readonly { id: string; service: string }[]; cerrarEn: string }) {
  const t = useT()
  const router = useRouter()
  const [estado, enviar, enviando] = useActionState(sinCaerse(saveCitaAction), INICIAL)
  const id = useId()
  useEffect(() => {
    if (estado.status === 'success') router.replace(cerrarEn)
  }, [estado, router, cerrarEn])
  const e = estado.status === 'error' ? estado.valores : undefined
  const v = (campo: string, base: string | number | null | undefined) => e?.[campo] ?? (base === null || base === undefined ? '' : String(base))

  return (
    <PanelDialog closeHref={cerrarEn} title={cita ? t('Editar cita', 'Edit appointment') : t('Nueva cita', 'New appointment')} width={560}>
      <form action={enviar} className="flex flex-col gap-4" key={e ? JSON.stringify(e) : 'form'}>
        <Ocultos {...evento} extra={{ citaId: cita?.id ?? '' }} />
        <Field htmlFor={`${id}-t`} label={t('Qué', 'What')}>
          <input className={FIELD_CLASS} defaultValue={v('title', cita?.title)} id={`${id}-t`} maxLength={200} name="title" placeholder={t('Por ejemplo, prueba del vestido', 'For example, dress fitting')} required />
        </Field>
        <div className="grid gap-3 min-[560px]:grid-cols-[1fr_140px_120px]">
          <Field htmlFor={`${id}-d`} label={t('Día', 'Day')}>
            <CampoFecha defaultValue={v('dia', cita?.startsAt.slice(0, 10) ?? dia)} id={`${id}-d`} name="dia" required />
          </Field>
          <Field htmlFor={`${id}-h`} label={t('Hora', 'Time')}>
            <CampoHora defaultValue={v('hora', cita?.startsAt.slice(11, 16))} id={`${id}-h`} name="hora" required />
          </Field>
          <Field htmlFor={`${id}-m`} label={t('Minutos', 'Minutes')}>
            <input className={FIELD_CLASS} defaultValue={v('durationMin', cita?.durationMin ?? 60)} id={`${id}-m`} inputMode="numeric" name="durationMin" />
          </Field>
        </div>
        <div className="grid gap-3 min-[560px]:grid-cols-2">
          <Field htmlFor={`${id}-l`} label={t('Dónde', 'Where')}>
            <input className={FIELD_CLASS} defaultValue={v('place', cita?.place)} id={`${id}-l`} maxLength={200} name="place" />
          </Field>
          <Field htmlFor={`${id}-p`} label={t('Proveedor', 'Vendor')}>
            <select className={FIELD_CLASS} defaultValue={v('vendorId', cita?.vendorId)} id={`${id}-p`} name="vendorId">
              <option value="">{t('Ninguno', 'None')}</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.service}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field htmlFor={`${id}-n`} label={t('Notas', 'Notes')}>
          <textarea className={FIELD_CLASS} defaultValue={v('notes', cita?.notes)} id={`${id}-n`} maxLength={2000} name="notes" rows={2} />
        </Field>
        <ActionFeedback errorsOnly state={estado} />
        <div className="flex items-center justify-end gap-3 border-t border-line-panel pt-4">
          <PanelButton href={cerrarEn}>{t('Cancelar', 'Cancel')}</PanelButton>
          <SubmitButton pending={enviando} pendingLabel={t('Guardando…', 'Saving…')} variant="primary">
            {cita ? t('Guardar cambios', 'Save changes') : t('Agendar', 'Book')}
          </SubmitButton>
        </div>
      </form>
      {cita ? (
        <div className="mt-4">
          <Accion action={removeCitaAction} evento={evento} extra={{ citaId: cita.id }} label={t(`Quitar «${cita.title}»`, `Remove “${cita.title}”`)} variant="danger">
            {t('Quitar esta cita', 'Remove this appointment')}
          </Accion>
        </div>
      ) : null}
    </PanelDialog>
  )
}

/**
 * «Ver en mi calendario»: el enlace privado que el teléfono sigue solo. Se enseña una vez (de él queda el
 * hash); pedir otro corta el anterior, y la pantalla lo dice antes de pulsar.
 */
export function SuscripcionAlCalendario({ evento }: { evento: Evento }) {
  const t = useT()
  const [estado, enviar, enviando] = useActionState(sinCaerse(emitirSuscripcionAction), INICIAL)
  const enlace = estado.status === 'success' ? estado.enlace : undefined
  return (
    <div className="flex flex-col gap-3 text-[13px] leading-relaxed text-ink-soft">
      <p>{t('Tu agenda dentro del calendario de tu teléfono (iPhone, Google Calendar u Outlook), para verla junto a lo demás. Es de solo lectura y se actualiza sola.', 'Your planner calendar inside your phone’s calendar (iPhone, Google Calendar or Outlook), to see it alongside everything else. It is read-only and updates itself.')}</p>
      <p className="text-[12px] text-ink-mute">{t('Los avisos te llegan por la campana y las notificaciones del panel: el calendario del teléfono suele quitar las alertas de lo que se suscribe.', 'Notifications reach you through the bell and the panel’s notifications: the phone’s calendar usually removes alerts from subscribed calendars.')}</p>
      {enlace ? (
        <>
          <PanelButton href={enlace.replace(/^https?:/, 'webcal:')} variant="primary">
            {t('Abrir en mi calendario', 'Open in my calendar')}
          </PanelButton>
          <CopyLinkButton label={t('Enlace para Google Calendar («Desde URL»)', 'Link for Google Calendar (“From URL”)')} url={enlace} />
          <p className="text-[12px] text-ink-mute">
            {t('Es tuyo: no lo compartas. El iPhone lo actualiza cuando elijas; Outlook, cada hora; Google, una vez al día.', 'It’s yours: don’t share it. iPhone updates it when you choose; Outlook, every hour; Google, once a day.')}
          </p>
        </>
      ) : (
        <form action={enviar} className="flex flex-col gap-2">
          <Ocultos {...evento} />
          <SubmitButton pending={enviando} pendingLabel={t('Preparando…', 'Preparing…')} variant="primary">
            {t('Ver en mi calendario', 'View in my calendar')}
          </SubmitButton>
          <p className="text-[12px] text-ink-mute">{t('Si ya lo habías pedido, el enlace anterior deja de actualizarse.', 'If you had requested it before, the previous link stops updating.')}</p>
        </form>
      )}
      <ActionFeedback errorsOnly state={estado} />
    </div>
  )
}

/**
 * «Hecha», «Pagado» y su «Deshacer» (9 oct): un botón que es su formulario. La acción lleva a `despues`
 * —con `?hecho=` para ofrecer deshacer—: el aviso vive en la URL porque la acción remonta la lista.
 */
export function MarcarEnLaAgenda({ evento, entrada, hecha, despues, children, variant = 'default' }: {
  evento: Evento
  entrada: Pick<EntradaDeAgenda, 'clase' | 'id' | 'titulo'>
  hecha: boolean
  despues: string
  children: string
  variant?: 'default' | 'primary'
}) {
  const t = useT()
  const [estado, enviar, enviando] = useActionState(sinCaerse(marcarEnLaAgendaAction), INICIAL)
  const que = entrada.clase === 'pago' ? (hecha ? t('Marcar pagado', 'Mark paid') : t('Deshacer el pago de', 'Undo the payment of')) : hecha ? t('Marcar hecha', 'Mark done') : t('Deshacer', 'Undo')
  return (
    <form action={enviar} className="inline-flex flex-col items-end gap-1">
      <Ocultos {...evento} extra={{ clase: entrada.clase, id: entrada.id, hecha: String(hecha), despues }} />
      <SubmitButton aria-label={`${que} ${t('«', '“')}${traducir(entrada.titulo, t)}${t('»', '”')}`} pending={enviando} pendingLabel="…" variant={variant}>
        {children}
      </SubmitButton>
      {estado.status === 'error' ? (
        <span className="text-[12px] text-danger-deep" role="alert">
          {estado.message}
        </span>
      ) : null}
    </form>
  )
}

/** «Cambiar fecha» de una tarea o un pago (`?mover=<clase>.<id>`): otro día y listo. */
export function ReprogramarDialog({ evento, entrada, hoy, cerrarEn }: { evento: Evento; entrada: Pick<EntradaDeAgenda, 'clase' | 'id' | 'titulo' | 'dia'>; hoy: string; cerrarEn: string }) {
  const t = useT()
  const router = useRouter()
  const [estado, enviar, enviando] = useActionState(sinCaerse(reprogramarEnLaAgendaAction), INICIAL)
  const id = useId()
  useEffect(() => {
    if (estado.status === 'success') router.replace(cerrarEn, { scroll: false })
  }, [estado, router, cerrarEn])
  return (
    <PanelDialog closeHref={cerrarEn} title={t('Cambiar fecha', 'Change date')} width={420}>
      <form action={enviar} className="flex flex-col gap-4">
        <Ocultos {...evento} extra={{ clase: entrada.clase, id: entrada.id }} />
        <p className="text-[13.5px] leading-relaxed text-ink-soft">
          «{entrada.titulo}» {entrada.dia < hoy ? 'venció' : 'vence'} el {entrada.dia.split('-').reverse().join('/')}. ¿Para qué día la pasamos?
        </p>
        <Field htmlFor={`${id}-d`} label={t('Nuevo día', 'New day')}>
          <CampoFecha defaultValue={hoy} id={`${id}-d`} name="dia" required />
        </Field>
        <ActionFeedback errorsOnly state={estado} />
        <div className="flex items-center justify-end gap-3 border-t border-line-panel pt-4">
          <PanelButton href={cerrarEn}>{t('Cancelar', 'Cancel')}</PanelButton>
          <SubmitButton pending={enviando} pendingLabel={t('Guardando…', 'Saving…')} variant="primary">
            {t('Cambiar fecha', 'Change date')}
          </SubmitButton>
        </div>
      </form>
    </PanelDialog>
  )
}
