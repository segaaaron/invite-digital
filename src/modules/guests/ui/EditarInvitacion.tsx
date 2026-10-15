'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { addPersonAction, removePersonAction, resendInvitationAction, setGroupPhoneAction, updatePersonAction } from '@/app/_acciones/guests/actions'
import { assignGroupAction, unassignGroupAction } from '@/app/_acciones/venue/actions'
import { ArrowLeftIcon, CloseIcon, CopyIcon, PlusIcon, QrIcon } from '@/shared/design/ui/icons'
import { botonClases, FIELD_CLASS, LABEL_CLASS } from '@/shared/design/ui/panel/PanelKit'
import { conCanal } from '../domain/invitation-url'
import { useT } from '@/shared/i18n/idioma-navegador'

export type PersonaDeInvitacion = { readonly id: string; readonly fullName: string; readonly isCompanion: boolean; readonly vip: boolean }
export type MesaElegible = { readonly id: string; readonly label: string; readonly libres: number }

/**
 * **Editar la invitación** (maqueta E36, T32, M43): la invitación entera en un panel —quiénes van, su teléfono, su
 * mesa y si es VIP—, con el pase arriba. Lo de cada persona (restricciones, correo, su respuesta) se edita aparte,
 * desde su fila.
 *
 * Se guarda todo al pulsar «Guardar cambios»: renombrar, quitar y sumar personas, el teléfono, la mesa y el VIP.
 * «¿Lo perdió? Generar enlace nuevo» rota el enlace (el anterior deja de abrir) y «Quitar la invitación» la borra
 * entera; los dos se confirman.
 */
export function EditarInvitacion({
  eventId,
  eventSlug,
  closeHref,
  invitacion,
  personas,
  mesas,
}: {
  eventId: string
  eventSlug: string
  closeHref: string
  invitacion: { readonly id: string; readonly label: string; readonly codigo: string | null; readonly enlace: string | null; readonly phone: string | null; readonly mesaId: string | null }
  personas: readonly PersonaDeInvitacion[]
  mesas: readonly MesaElegible[]
}) {
  const t = useT()
  const router = useRouter()
  const dialogo = useRef<HTMLDialogElement>(null)
  const id = useId()
  const principal = personas.find((p) => !p.isCompanion) ?? personas[0]
  const [nombres, setNombres] = useState<Record<string, string>>(() => Object.fromEntries(personas.map((p) => [p.id, p.fullName])))
  const [quitadas, setQuitadas] = useState<ReadonlySet<string>>(new Set())
  const [nuevas, setNuevas] = useState<string[]>([])
  const [telefono, setTelefono] = useState(invitacion.phone ?? '')
  const [mesa, setMesa] = useState(invitacion.mesaId ?? '')
  const [vip, setVip] = useState(principal?.vip ?? false)
  const [copiado, setCopiado] = useState(false)
  const [enlace, setEnlace] = useState(invitacion.enlace)
  const [confirmar, setConfirmar] = useState<'enlace' | 'quitar' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  useEffect(() => {
    const nodo = dialogo.current
    if (nodo !== null && !nodo.open) nodo.showModal()
  }, [])

  const cerrar = () => {
    dialogo.current?.close()
    router.replace(closeHref)
  }


  const guardar = () => {
    setError(null)
    empezar(async () => {
      type Hecho = { status?: string; ok?: boolean; message?: string | undefined }
      const pasos: Array<() => Promise<Hecho>> = []
      for (const p of personas) {
        if (quitadas.has(p.id)) continue
        const nombre = (nombres[p.id] ?? '').trim()
        if (nombre !== '' && nombre !== p.fullName) pasos.push(() => updatePersonAction({ eventSlug, id: p.id, fullName: nombre }))
      }
      if (principal !== undefined && !quitadas.has(principal.id) && vip !== principal.vip) pasos.push(() => updatePersonAction({ eventSlug, id: principal.id, vip }))
      for (const n of nuevas.map((x) => x.trim()).filter(Boolean)) pasos.push(() => addPersonAction({ eventSlug, guestGroupId: invitacion.id, fullName: n }))
      if (telefono.trim() !== (invitacion.phone ?? '')) pasos.push(() => setGroupPhoneAction({ eventSlug, id: invitacion.id, phone: telefono.trim() }))
      if (mesa !== (invitacion.mesaId ?? '')) {
        pasos.push(() =>
          mesa === '' ? unassignGroupAction({ eventId, eventSlug, groupId: invitacion.id }) : assignGroupAction({ eventId, eventSlug, groupId: invitacion.id, tableId: mesa }),
        )
      }
      // Quitar va al final: si se quita a todos, la invitación se va con la última persona.
      for (const q of quitadas) pasos.push(() => removePersonAction({ eventSlug, id: q }))
      for (const paso of pasos) {
        const r = await paso()
        if (r.status === 'error' || r.ok === false) {
          setError(r.message ?? t('No se pudo guardar un cambio.', 'A change couldn’t be saved.'))
          return
        }
      }
      cerrar()
      router.refresh()
    })
  }

  const enlaceNuevo = () => {
    setError(null)
    empezar(async () => {
      const datos = new FormData()
      datos.set('eventSlug', eventSlug)
      datos.set('groupId', invitacion.id)
      const r = await resendInvitationAction({ status: 'idle' }, datos)
      if (r.status === 'error') setError(r.message)
      else if (r.status === 'success') setEnlace(r.url)
      setConfirmar(null)
      router.refresh()
    })
  }

  const quitarInvitacion = () => {
    setError(null)
    empezar(async () => {
      for (const p of personas) {
        const r = await removePersonAction({ eventSlug, id: p.id })
        if (r.status === 'error') {
          setError(r.message ?? t('No se pudo quitar la invitación.', 'The invitation couldn’t be removed.'))
          return
        }
      }
      cerrar()
      router.refresh()
    })
  }

  const vivas = personas.filter((p) => !quitadas.has(p.id))
  const total = vivas.length + nuevas.filter((n) => n.trim() !== '').length

  return (
    <dialog
      aria-labelledby={`${id}-titulo`}
      className="m-0 max-h-dvh max-w-none overflow-y-auto border border-line-panel bg-bg p-0 text-ink shadow-float backdrop:bg-shell-deep/50 max-[767px]:fixed max-[767px]:inset-0 max-[767px]:h-dvh max-[767px]:w-full max-[767px]:border-0 min-[768px]:fixed min-[768px]:inset-y-0 min-[768px]:right-0 min-[768px]:left-auto min-[768px]:h-dvh min-[768px]:w-[min(520px,100vw)] min-[768px]:border-y-0 min-[768px]:border-r-0"
      onCancel={(e) => {
        e.preventDefault()
        cerrar()
      }}
      ref={dialogo}
    >
      <div className="flex min-h-full flex-col">
        {/* En el celular, «← Invitados / la invitación» (M43). */}
        <button
          className="mx-4 mt-2.5 flex min-h-15 shrink-0 cursor-pointer items-center gap-2 rounded-[18px] border border-line-panel bg-bg-raised px-1.5 text-left shadow-[0_8px_24px_-14px_rgb(12_36_32/0.28)] min-[768px]:hidden"
          onClick={cerrar}
          type="button"
        >
          <span aria-hidden className="grid size-11 shrink-0 place-items-center">
            <ArrowLeftIcon className="size-5" />
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[13px] text-ink-mute">{t('Invitados', 'Guests')}</span>
            <span className="truncate text-[16px] font-medium">{invitacion.label}</span>
          </span>
          <span className="sr-only">{t(': cerrar', ': close')}</span>
        </button>

        <header className="flex items-start justify-between gap-4 px-7 pt-7 max-[767px]:hidden">
          <div className="min-w-0">
            <p className="text-[14px] text-ink-mute">{total === 1 ? t('Invitación de 1 persona', 'Invitation for 1 person') : t(`Invitación de ${total} personas`, `Invitation for ${total} people`)}</p>
            <h2 className="font-display text-[30px] leading-tight font-medium" id={`${id}-titulo`}>
              {invitacion.label}
            </h2>
          </div>
          <button aria-label={t('Cerrar', 'Close')} className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-[10px] border border-line-panel-strong bg-bg-raised hover:border-gold" onClick={cerrar} type="button">
            <CloseIcon className="size-4" />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-5 px-7 py-5 max-[767px]:px-4">
          {invitacion.codigo === null && enlace === null ? null : (
            <div className="flex items-center gap-4 rounded-[14px] border border-line-panel bg-bg-raised px-4.5 py-4">
              <QrIcon className="size-9 shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-[13px] text-ink-mute">{t('Código del pase', 'Pass code')}</span>
                {invitacion.codigo === null ? null : <span className="font-display text-[28px] leading-tight font-medium tracking-[0.08em]">{invitacion.codigo}</span>}
                {enlace === null ? null : <span className="truncate text-[12.5px] text-ink-mute">{conCanal(enlace, 'enlace')}</span>}
              </div>
              {enlace === null ? null : (
                <button
                  className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-[10px] border border-line-panel-strong bg-bg px-3.5 text-[14px] font-medium hover:border-gold"
                  onClick={() => {
                    void navigator.clipboard?.writeText(conCanal(enlace, 'enlace'))
                    setCopiado(true)
                  }}
                  type="button"
                >
                  <CopyIcon className="size-4" /> {copiado ? t('Copiado', 'Copied') : t('Copiar enlace', 'Copy link')}
                </button>
              )}
            </div>
          )}

          <fieldset className="flex flex-col gap-2.5">
            <legend className={`${LABEL_CLASS} mb-2.5`}>{t('Personas', 'People')}</legend>
            {vivas.map((p) => (
              <div className="flex items-center gap-2.5" key={p.id}>
                <span className="relative min-w-0 flex-1">
                  <input
                    aria-label={t(`Nombre de ${p.fullName}`, `${p.fullName}’s name`)}
                    className={FIELD_CLASS}
                    maxLength={160}
                    onChange={(e) => setNombres((n) => ({ ...n, [p.id]: e.target.value }))}
                    value={nombres[p.id] ?? ''}
                  />
                </span>
                {p.id === principal?.id ? <span className="shrink-0 rounded-full bg-pill-ok px-2.5 py-1 text-[12.5px] font-medium text-pill-ok-ink">{t('Principal', 'Main')}</span> : null}
                <button
                  aria-label={t(`Quitar a ${p.fullName}`, `Remove ${p.fullName}`)}
                  className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-[10px] border border-line-panel-strong bg-bg-raised hover:border-danger hover:text-danger"
                  onClick={() => setQuitadas((q) => new Set(q).add(p.id))}
                  type="button"
                >
                  <CloseIcon className="size-4" />
                </button>
              </div>
            ))}
            {nuevas.map((n, i) => (
              <div className="flex items-center gap-2.5" key={`nueva-${i}`}>
                <input
                  aria-label={t('Nombre del acompañante', 'Companion’s name')}
                  autoFocus
                  className={FIELD_CLASS}
                  maxLength={160}
                  onChange={(e) => setNuevas((todas) => todas.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder={t('Nombre del acompañante', 'Companion’s name')}
                  value={n}
                />
                <button
                  aria-label={t('Quitar este acompañante', 'Remove this companion')}
                  className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-[10px] border border-line-panel-strong bg-bg-raised"
                  onClick={() => setNuevas((todas) => todas.filter((_, j) => j !== i))}
                  type="button"
                >
                  <CloseIcon className="size-4" />
                </button>
              </div>
            ))}
            <button className="flex min-h-11 w-fit cursor-pointer items-center gap-2 text-[15px] font-medium text-gold-deep" onClick={() => setNuevas((todas) => [...todas, ''])} type="button">
              <PlusIcon className="size-4" /> {t('Añadir acompañante', 'Add companion')}
            </button>
          </fieldset>

          <label className="flex flex-col gap-2" htmlFor={`${id}-tel`}>
            <span className={LABEL_CLASS}>{t('Teléfono para WhatsApp', 'WhatsApp phone')}</span>
            <input autoComplete="off" className={FIELD_CLASS} id={`${id}-tel`} inputMode="tel" maxLength={40} onChange={(e) => setTelefono(e.target.value)} placeholder="+591 70000000" type="tel" value={telefono} />
          </label>

          {mesas.length === 0 ? null : (
            <label className="flex flex-col gap-2" htmlFor={`${id}-mesa`}>
              <span className={LABEL_CLASS}>{t('Mesa', 'Table')}</span>
              <select className={FIELD_CLASS} id={`${id}-mesa`} onChange={(e) => setMesa(e.target.value)} value={mesa}>
                <option value="">{t('Sin mesa', 'No table')}</option>
                {mesas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.libres === 1 ? '1 libre' : `${m.libres} libres`})
                  </option>
                ))}
              </select>
            </label>
          )}

          {principal === undefined ? null : (
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
              <input checked={vip} className="size-5 accent-shell-deep" onChange={(e) => setVip(e.target.checked)} type="checkbox" />
              {t('Marcar como VIP en la recepción', 'Mark as VIP at reception')}
            </label>
          )}

          {error === null ? null : (
            <p className="text-[13.5px] text-danger" role="alert">
              {error}
            </p>
          )}

          {confirmar === null ? null : (
            <div className="flex flex-col gap-3 rounded-[12px] bg-danger/10 px-4 py-3.5 text-[14.5px] text-danger-deep" role="alertdialog">
              <p>
                {confirmar === 'enlace'
                  ? t('Se genera un enlace nuevo y el anterior deja de abrir. Envíaselo otra vez.', 'A new link is generated and the old one stops opening. Send it to them again.')
                  : t('Se borra la invitación con todas sus personas y su enlace deja de abrir. No se puede deshacer.', 'The invitation is deleted with all its people and its link stops opening. This can’t be undone.')}
              </p>
              <div className="flex flex-wrap gap-2.5">
                <button className={botonClases('default')} onClick={() => setConfirmar(null)} type="button">
                  {t('Cancelar', 'Cancel')}
                </button>
                <button className={botonClases('peligro')} disabled={pendiente} onClick={confirmar === 'enlace' ? enlaceNuevo : quitarInvitacion} type="button">
                  {confirmar === 'enlace' ? t('Generar enlace nuevo', 'Generate new link') : t('Quitar la invitación', 'Remove the invitation')}
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className="sticky bottom-0 flex flex-col gap-3 border-t border-line-panel bg-bg px-7 py-4 max-[767px]:px-4 max-[767px]:pb-[max(16px,env(safe-area-inset-bottom))]">
          <div className="flex justify-end gap-2.5 max-[767px]:flex-col-reverse">
            <button className={`${botonClases('default')} max-[767px]:hidden`} onClick={cerrar} type="button">
              {t('Cancelar', 'Cancel')}
            </button>
            <button aria-busy={pendiente || undefined} className={botonClases('primary')} disabled={pendiente} onClick={guardar} type="button">
              {pendiente ? t('Guardando…', 'Saving…') : t('Guardar cambios', 'Save changes')}
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[14.5px] font-medium">
            <button className="min-h-11 cursor-pointer text-gold-deep hover:underline" onClick={() => setConfirmar('enlace')} type="button">
              {t('¿Lo perdió? Generar enlace nuevo', 'Lost it? Generate new link')}
            </button>
            <button className="min-h-11 cursor-pointer text-danger hover:underline" onClick={() => setConfirmar('quitar')} type="button">
              {t('Quitar la invitación', 'Remove the invitation')}
            </button>
          </div>
        </footer>
      </div>
    </dialog>
  )
}
