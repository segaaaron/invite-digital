'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useId } from 'react'
import { type AgendaActionState, emitirSuscripcionAction, removeCitaAction, saveCitaAction } from '@/app/_acciones/planner/agenda-actions'
import { CopyLinkButton } from '@/shared/design/ui/CopyLinkButton'
import { CampoFecha, CampoHora } from '@/shared/design/ui/panel/campos-de-fecha'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { PanelDialog } from '@/shared/design/ui/panel/PanelDialog'
import { FIELD_CLASS, Field, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import type { Cita } from '../domain/agenda'
import { Accion, type Evento, Ocultos } from './Accion'

const INICIAL: AgendaActionState = { status: 'idle' }

/** Nueva cita o su edición (`?cita=nueva|<id>`). */
export function CitaDialog({ evento, cita, dia, proveedores, cerrarEn }: { evento: Evento; cita?: Cita | undefined; dia: string; proveedores: readonly { id: string; service: string }[]; cerrarEn: string }) {
  const router = useRouter()
  const [estado, enviar, enviando] = useActionState(sinCaerse(saveCitaAction), INICIAL)
  const id = useId()
  useEffect(() => {
    if (estado.status === 'success') router.replace(cerrarEn)
  }, [estado, router, cerrarEn])
  const e = estado.status === 'error' ? estado.valores : undefined
  const v = (campo: string, base: string | number | null | undefined) => e?.[campo] ?? (base === null || base === undefined ? '' : String(base))

  return (
    <PanelDialog closeHref={cerrarEn} title={cita ? 'Editar cita' : 'Nueva cita'} width={560}>
      <form action={enviar} className="flex flex-col gap-4" key={e ? JSON.stringify(e) : 'form'}>
        <Ocultos {...evento} extra={{ citaId: cita?.id ?? '' }} />
        <Field htmlFor={`${id}-t`} label="Qué">
          <input className={FIELD_CLASS} defaultValue={v('title', cita?.title)} id={`${id}-t`} maxLength={200} name="title" placeholder="Por ejemplo, prueba del vestido" required />
        </Field>
        <div className="grid gap-3 min-[560px]:grid-cols-[1fr_140px_120px]">
          <Field htmlFor={`${id}-d`} label="Día">
            <CampoFecha defaultValue={v('dia', cita?.startsAt.slice(0, 10) ?? dia)} id={`${id}-d`} name="dia" required />
          </Field>
          <Field htmlFor={`${id}-h`} label="Hora">
            <CampoHora defaultValue={v('hora', cita?.startsAt.slice(11, 16))} id={`${id}-h`} name="hora" required />
          </Field>
          <Field htmlFor={`${id}-m`} label="Minutos">
            <input className={FIELD_CLASS} defaultValue={v('durationMin', cita?.durationMin ?? 60)} id={`${id}-m`} inputMode="numeric" name="durationMin" />
          </Field>
        </div>
        <div className="grid gap-3 min-[560px]:grid-cols-2">
          <Field htmlFor={`${id}-l`} label="Dónde">
            <input className={FIELD_CLASS} defaultValue={v('place', cita?.place)} id={`${id}-l`} maxLength={200} name="place" />
          </Field>
          <Field htmlFor={`${id}-p`} label="Proveedor">
            <select className={FIELD_CLASS} defaultValue={v('vendorId', cita?.vendorId)} id={`${id}-p`} name="vendorId">
              <option value="">Ninguno</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.service}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field htmlFor={`${id}-n`} label="Notas">
          <textarea className={FIELD_CLASS} defaultValue={v('notes', cita?.notes)} id={`${id}-n`} maxLength={2000} name="notes" rows={2} />
        </Field>
        <ActionFeedback errorsOnly state={estado} />
        <div className="flex items-center justify-end gap-3 border-t border-line-panel pt-4">
          <PanelButton href={cerrarEn}>Cancelar</PanelButton>
          <SubmitButton pending={enviando} pendingLabel="Guardando…" variant="primary">
            {cita ? 'Guardar cambios' : 'Agendar'}
          </SubmitButton>
        </div>
      </form>
      {cita ? (
        <div className="mt-4">
          <Accion action={removeCitaAction} evento={evento} extra={{ citaId: cita.id }} label={`Quitar «${cita.title}»`} variant="danger">
            Quitar esta cita
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
  const [estado, enviar, enviando] = useActionState(sinCaerse(emitirSuscripcionAction), INICIAL)
  const enlace = estado.status === 'success' ? estado.enlace : undefined
  return (
    <div className="flex flex-col gap-3 text-[13px] leading-relaxed text-ink-soft">
      <p>Tu agenda en el calendario de tu teléfono (iPhone, Google Calendar u Outlook), sin cuentas ni permisos. Es de solo lectura y se actualiza sola.</p>
      {enlace ? (
        <>
          <PanelButton href={enlace.replace(/^https?:/, 'webcal:')} variant="primary">
            Abrir en mi calendario
          </PanelButton>
          <CopyLinkButton label="Enlace para Google Calendar («Desde URL»)" url={enlace} />
          <p className="text-[12px] text-ink-mute">
            Es tuyo: no lo compartas. El iPhone lo actualiza cuando elijas; Outlook, cada hora; Google, una vez al día.
          </p>
        </>
      ) : (
        <form action={enviar} className="flex flex-col gap-2">
          <Ocultos {...evento} />
          <SubmitButton pending={enviando} pendingLabel="Preparando…" variant="primary">
            Ver en mi calendario
          </SubmitButton>
          <p className="text-[12px] text-ink-mute">Si ya lo habías pedido, el enlace anterior deja de actualizarse.</p>
        </form>
      )}
      <ActionFeedback errorsOnly state={estado} />
    </div>
  )
}
