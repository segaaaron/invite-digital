'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { FIELD_CLASS, Field, LABEL_CLASS } from '@/shared/design/ui/panel/PanelKit'
import { CloseIcon, PlusIcon, ArrowLeftIcon } from '@/shared/design/ui/icons'
import { CampoTelefono } from '@/shared/design/ui/panel/CampoTelefono'
import { addGuestAction, type GuestActionState } from '@/app/_acciones/guests/actions'
import { SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { useT } from '@/shared/i18n/idioma-navegador'

export type GroupChoice = {
  readonly id: string
  readonly label: string
  readonly free: number
}

const INICIAL: GuestActionState = { status: 'idle', message: '' }

/**
 * El alta de invitado de la maqueta, entera y en un diálogo: nombre, grupo, acompañantes,
 * restricciones, WhatsApp, correo y VIP. Sin RSVP: lo decide el invitado.
 *
 * **Se pregunta cómo le llega la invitación, no a qué grupo pertenece.** Lo primero es
 * «invitación propia», que es el caso normal y no exige escribir nada más: la invitación se
 * llama como el invitado. Lo segundo es sumarse a una que ya existe —la familia, la oficina—,
 * y entonces comparte enlace, cupos y mesa. Antes se empezaba eligiendo un grupo ajeno de un
 * desplegable, y dar de alta a una persona sola obligaba a buscar «Grupo nuevo…» al final.
 *
 * Debajo sigue siendo lo mismo: el grupo es el dueño del enlace y de los cupos, así que
 * «Ana Lucía Vega + 2» son tres cupos de un grupo, no tres invitaciones sueltas.
 */
export function GuestDialog({
  eventId,
  eventSlug,
  closeHref,
  atLimit = false,
  notice,
}: {
  eventId: string
  eventSlug: string
  closeHref: string
  /** El plan ya no admite más grupos: se puede añadir a uno existente, no crear otro. */
  atLimit?: boolean
  /** El aviso de capacidad del plan, que se pinta dentro del diálogo. */
  notice?: ReactNode
}) {
  const t = useT()
  const router = useRouter()
  const dialogo = useRef<HTMLDialogElement>(null)
  const [estado, accion, pendiente] = useActionState<GuestActionState, FormData>(sinCaerse(addGuestAction), INICIAL)
  /**
   * Personal o familiar, y ya está.
   *
   * Personal o acompañado. Las dos crean su invitación, que se llama como el invitado;
   * acompañado además pregunta cuántos van con él. Sumar a alguien a una invitación que ya existe **no se pregunta
   * aquí**: se entra desde la fila de esa invitación, que es donde se ve de quién es.
   */
  const [tipo, setTipo] = useState('personal')
  // Un nombre por acompañante: es lo único que se les pide.
  const [acompanantes, setAcompanantes] = useState<readonly string[]>([])
  // El teléfono se guarda en formato internacional; el campo enseña su país y su número local.
  const [telefono, setTelefono] = useState('')

  const idNombre = useId()
  const idAcomp = useId()
  const idDieta = useId()
  const idTel = useId()
  const idCorreo = useId()
  const idVip = useId()

  // `showModal()` es lo único que hace inerte el fondo; el atributo `open` del marcado
  // abre el diálogo pero deja la página de detrás navegable con el tabulador.
  useEffect(() => {
    const nodo = dialogo.current
    if (nodo !== null && !nodo.open) nodo.showModal()
  }, [])

  // Guardar cierra el diálogo, como en la maqueta; «Guardar y añadir otro» lo deja abierto y vacío para el siguiente.
  // El enlace no se enseña aquí: se prepara al mandarlo, desde «Enviar invitaciones».
  const otro = useRef(false)
  const [vuelta, setVuelta] = useState(0)
  useEffect(() => {
    if (estado.status !== 'success') return
    if (otro.current) {
      otro.current = false
      setTipo('personal')
      setAcompanantes([])
      setTelefono('')
      setVuelta((v) => v + 1)
      return
    }
    dialogo.current?.close()
    router.replace(closeHref)
  }, [estado, closeHref, router])

  const cerrar = () => {
    dialogo.current?.close()
    router.replace(closeHref)
  }

  // Toda alta crea su invitación, así que toda alta cuenta contra el tope del plan.
  const nuevoGrupo = true
  const tarjeta =
    'flex cursor-pointer items-center gap-3.5 rounded-[12px] border border-line-panel-strong bg-bg-raised px-4 py-3 has-[:checked]:border-[1.5px] has-[:checked]:border-shell-deep has-focus-visible:outline-2 has-focus-visible:outline-gold'

  return (
    // El alta como panel que entra por la derecha (E53): nombre, si viene solo o acompañado, y su WhatsApp. Lo demás
    // —restricciones, correo, VIP— plegado; se edita también luego desde su fila.
    <dialog
      ref={dialogo}
      aria-labelledby={`${idNombre}-titulo`}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-none border-l border-line-panel bg-bg p-0 text-ink shadow-float backdrop:bg-shell-deep/50 min-[640px]:w-[min(520px,100vw)]"
      onCancel={(e) => {
        // Escape cierra el `<dialog>` por su cuenta; sin esto la dirección se queda en
        // `?panel=alta` y volver a pulsar «+ Añadir invitado» no navega a ninguna parte:
        // el botón queda muerto hasta recargar a mano.
        e.preventDefault()
        cerrar()
      }}
    >
      <form action={accion} className="flex h-full flex-col" key={vuelta}>
        <input name="eventId" type="hidden" value={eventId} />
        <input name="eventSlug" type="hidden" value={eventSlug} />

        {/* En el celular, la barra «← Invitados / Añadir invitado» de la maqueta (M50) en vez del ✕. */}
        <button
          className="mx-4 mt-2.5 flex min-h-15 shrink-0 cursor-pointer items-center gap-2 rounded-[18px] border border-line-panel bg-bg-raised px-1.5 text-left shadow-[0_8px_24px_-14px_rgb(12_36_32/0.28)] min-[640px]:hidden"
          onClick={cerrar}
          type="button"
        >
          <span aria-hidden className="grid size-11 shrink-0 place-items-center">
            <ArrowLeftIcon className="size-5" />
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[13px] text-ink-mute">{t('Invitados', 'Guests')}</span>
            <span className="truncate text-[16px] font-medium">{t('Añadir invitado', 'Add guest')}</span>
          </span>
          <span className="sr-only">{t(': cerrar', ': close')}</span>
        </button>
        <header className="flex items-start justify-between gap-4 px-7 pt-7 pb-2 max-[639px]:px-4 max-[639px]:pt-5">
          <div>
            <p className="text-[14px] text-ink-mute max-[639px]:hidden">{t('Invitados', 'Guests')}</p>
            <h2 className="font-display text-[30px] leading-tight font-medium" id={`${idNombre}-titulo`}>
              {t('Añadir invitado', 'Add guest')}
            </h2>
          </div>
          <button
            aria-label={t('Cerrar', 'Close')}
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-[10px] border border-line-panel-strong bg-bg-raised hover:border-gold max-[639px]:hidden"
            onClick={cerrar}
            type="button"
          >
            <CloseIcon className="size-4" />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-7 py-4 max-[639px]:px-5">
          <Field hint={t('Como quieres que aparezca en su invitación', 'How you want it to appear on their invitation')} htmlFor={idNombre} label={t('Nombre', 'Name')}>
            <input aria-label={t('Nombre completo', 'Full name')} autoFocus className={FIELD_CLASS} id={idNombre} maxLength={160} name="fullName" required type="text" />
          </Field>

          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-2.5 text-[14px] font-medium">{t('¿Viene solo?', 'Coming alone?')}</legend>
            <label className={tarjeta}>
              <input
                checked={tipo === 'personal'}
                className="size-5 accent-[var(--color-shell-deep)]"
                name="tipoDeInvitacion"
                onChange={() => {
                  setTipo('personal')
                  setAcompanantes([])
                }}
                type="radio"
                value="personal"
              />
              <span className="flex flex-col">
                <span className="text-[15px] font-medium">{t('Personal', 'Individual')}</span>
                <span className="text-[13.5px] text-ink-mute">{t('Una persona', 'One person')}</span>
              </span>
            </label>
            <label className={tarjeta}>
              <input
                checked={tipo === 'acompanado'}
                className="size-5 accent-[var(--color-shell-deep)]"
                name="tipoDeInvitacion"
                onChange={() => {
                  setTipo('acompanado')
                  // Al pasar a acompañado hay que poder escribir ya: sin una fila, no habría dónde teclear.
                  if (acompanantes.length === 0) setAcompanantes([''])
                }}
                type="radio"
                value="acompanado"
              />
              <span className="flex flex-col">
                <span className="text-[15px] font-medium">{t('Con acompañantes', 'With companions')}</span>
                <span className="text-[13.5px] text-ink-mute">{t('Escribe el nombre de cada uno', 'Write each one’s name')}</span>
              </span>
            </label>
          </fieldset>

          {tipo === 'personal' ? null : (
            <div className="flex flex-col gap-2">
              <span className={LABEL_CLASS}>{t('Acompañantes', 'Companions')}</span>
              {/* De cada acompañante **solo el nombre**. Lo demás —su comida, su confirmación— se edita luego desde su fila. */}
              {acompanantes.map((valor, indice) => (
                <span className="flex min-w-0 gap-2" key={indice}>
                  <label className="sr-only" htmlFor={`${idAcomp}-${indice}`}>
                    {t(`Nombre del acompañante ${indice + 1}`, `Companion ${indice + 1}’s name`)}
                  </label>
                  <input
                    className={`${FIELD_CLASS} min-w-0 flex-1`}
                    id={`${idAcomp}-${indice}`}
                    maxLength={160}
                    name="companionName"
                    onChange={(e) => setAcompanantes((previos) => previos.map((p, i) => (i === indice ? e.target.value : p)))}
                    placeholder={t('Nombre del acompañante', 'Companion’s name')}
                    type="text"
                    value={valor}
                  />
                  <button
                    aria-label={t(`Quitar acompañante ${indice + 1}`, `Remove companion ${indice + 1}`)}
                    className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-[10px] border border-line-panel-strong bg-bg-raised hover:border-gold"
                    onClick={() => setAcompanantes((previos) => previos.filter((_, i) => i !== indice))}
                    type="button"
                  >
                    <CloseIcon className="size-3.5" />
                  </button>
                </span>
              ))}
              <button
                className="flex min-h-11 w-fit cursor-pointer items-center gap-2 px-1 text-[15px] font-medium text-gold-deep hover:underline"
                onClick={() => setAcompanantes((previos) => [...previos, ''])}
                type="button"
              >
                <PlusIcon className="size-4" /> {t('Otro acompañante', 'Another companion')}
              </button>
            </div>
          )}

          {notice === undefined ? null : <div>{notice}</div>}

          <Field hint={t('Opcional. Sin él, envías el enlace por otra vía', 'Optional. Without it, you send the link another way')} htmlFor={idTel} label={t('Teléfono para WhatsApp', 'WhatsApp phone')}>
            <CampoTelefono id={idTel} name="phone" onChange={setTelefono} value={telefono} />
          </Field>

          {/* Sin RSVP al crear: la asistencia la decide el invitado desde su invitación. */}
          <details className="group">
            <summary className="inline-flex min-h-10 cursor-pointer list-none items-center text-[14px] text-ink-mute hover:text-ink [&::-webkit-details-marker]:hidden">
              {t('Restricciones, correo y VIP', 'Dietary restrictions, email and VIP')}
            </summary>
            <div className="mt-3 flex flex-col gap-4">
              <Field htmlFor={idDieta} label={t('Restricciones', 'Dietary restrictions')}>
                <input className={FIELD_CLASS} id={idDieta} maxLength={200} name="dietaryNote" placeholder={t('Vegano, sin gluten…', 'Vegan, gluten-free…')} type="text" />
              </Field>
              <Field htmlFor={idCorreo} label="Email">
                <input className={FIELD_CLASS} id={idCorreo} maxLength={160} name="email" placeholder={t('correo@ejemplo.com', 'email@example.com')} type="email" />
              </Field>
              <label className="flex items-center gap-2.5 text-[14px]" htmlFor={idVip}>
                <input className="size-4" id={idVip} name="vip" type="checkbox" />
                <span className="flex flex-col">
                  {t('Invitado VIP', 'VIP guest')}
                  <span className="text-[13px] text-ink-mute">{t('Se marca en la lista, se filtra aparte y su silla sale en dorado en el plano del salón.', 'They are marked on the list, filtered separately and their seat shows in gold on the floor plan.')}</span>
                </span>
              </label>
            </div>
          </details>

          {estado.status === 'error' ? (
            <p className="text-[14px] text-danger" role="alert">
              {estado.message}
            </p>
          ) : null}
          {estado.status === 'success' && vuelta > 0 ? (
            <p className="text-[14px] text-ok-deep" role="status">
              {t('Guardado. Escribe el siguiente.', 'Saved. Write the next one.')}
            </p>
          ) : null}
        </div>

        <footer className="flex justify-end gap-2.5 border-t border-line-panel px-7 py-4 max-[639px]:flex-col-reverse max-[639px]:border-t-0 max-[639px]:px-4 max-[639px]:pb-[max(16px,env(safe-area-inset-bottom))]">
          <SubmitButton
            disabled={pendiente || (nuevoGrupo && atLimit)}
            onClick={() => {
              otro.current = true
            }}
            pending={pendiente}
            variant="default"
          >
            {t('Guardar y añadir otro', 'Save and add another')}
          </SubmitButton>
          <SubmitButton
            disabled={pendiente || (nuevoGrupo && atLimit)}
            onClick={() => {
              otro.current = false
            }}
            pending={pendiente}
            pendingLabel={t('Guardando…', 'Saving…')}
            variant="primary"
          >
            {t('Guardar', 'Save')}
          </SubmitButton>
        </footer>
      </form>
    </dialog>
  )
}
