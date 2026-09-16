'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { FIELD_CLASS, Field, LABEL_CLASS, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { CampoTelefono } from '@/shared/design/ui/panel/CampoTelefono'
import { addGuestAction, type GuestActionState } from '@/app/_acciones/guests/actions'
import { SubmitButton } from '@/shared/design/ui/panel/estados'

export type GroupChoice = {
  readonly id: string
  readonly label: string
  readonly free: number
}

const INICIAL: GuestActionState = { status: 'idle', message: '' }

/**
 * El alta de invitado de la maqueta, entera y en un diálogo: nombre, grupo, acompañantes,
 * RSVP, restricciones, WhatsApp, correo y VIP.
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
  groups,
  closeHref,
  atLimit = false,
  notice,
}: {
  eventId: string
  eventSlug: string
  groups: readonly GroupChoice[]
  closeHref: string
  /** El plan ya no admite más grupos: se puede añadir a uno existente, no crear otro. */
  atLimit?: boolean
  /** El aviso de capacidad del plan, que se pinta dentro del diálogo. */
  notice?: ReactNode
}) {
  const router = useRouter()
  const dialogo = useRef<HTMLDialogElement>(null)
  const [estado, accion, pendiente] = useActionState<GuestActionState, FormData>(addGuestAction, INICIAL)
  /**
   * Cómo le llega la invitación, que es la pregunta de verdad.
   *
   * El formulario empezaba con un desplegable de grupos ya creados —«amigo · 2 libres»— y el
   * primero venía elegido: para dar de alta a una persona había que meterla dentro del grupo
   * de otro, o encontrar «Grupo nuevo…» al final de la lista. Lo normal es lo contrario, así
   * que lo normal es lo que viene puesto.
   */
  // Con el tope del plan alcanzado no se pueden crear más invitaciones: se empieza por sumar
  // a una que ya existe, que es lo único que el servidor va a aceptar.
  const [modo, setModo] = useState<'propia' | 'grupo'>(atLimit && groups.length > 0 ? 'grupo' : 'propia')
  const [grupo, setGrupo] = useState(groups[0]?.id ?? '')
  // El teléfono se guarda en formato internacional; el campo enseña su país y su número local.
  const [telefono, setTelefono] = useState('')

  const idNombre = useId()
  const idGrupo = useId()
  const idNuevo = useId()
  const idAcomp = useId()
  const idRsvp = useId()
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

  // Guardar cierra el diálogo, como en la maqueta. **Salvo** cuando el grupo era nuevo:
  // entonces hay un enlace que solo se enseña una vez, y cerrar se lo llevaría por
  // delante. En ese caso lo cierra quien lo ha copiado.
  const hayEnlace = estado.status === 'success' && Boolean(estado.token)
  useEffect(() => {
    if (estado.status === 'success' && !estado.token) {
      dialogo.current?.close()
      router.replace(closeHref)
    }
  }, [estado, closeHref, router])

  const cerrar = () => {
    dialogo.current?.close()
    router.replace(closeHref)
  }

  const nuevoGrupo = modo === 'propia'

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={`${idNombre}-titulo`}
      className="m-auto w-[min(560px,94vw)] rounded-[18px] border border-line-panel bg-bg-raised p-7 text-ink shadow-float backdrop:bg-ink/45"
      onCancel={(e) => {
        // Escape cierra el `<dialog>` por su cuenta; sin esto la dirección se queda en
        // `?panel=alta` y volver a pulsar «+ Añadir invitado» no navega a ninguna parte:
        // el botón queda muerto hasta recargar a mano.
        e.preventDefault()
        cerrar()
      }}
    >
      <h2 className="font-display text-[24px] font-light italic" id={`${idNombre}-titulo`}>
        Añadir invitado
      </h2>

      {/* Cuando el grupo es nuevo, su enlace se enseña una sola vez: en la base solo
          queda el hash, y no hay forma de volver a mostrarlo. */}
      {hayEnlace ? (
        <div className="mt-5 flex flex-col gap-2 rounded-[14px] border border-gold/50 bg-gold/10 p-4" role="status">
          <p className="text-[13px] text-ink">Grupo creado. Este enlace no se vuelve a mostrar:</p>
          <label className="sr-only" htmlFor={`${idNombre}-enlace`}>
            Enlace de la invitación
          </label>
          <input className={FIELD_CLASS} id={`${idNombre}-enlace`} readOnly value={estado.token ?? ''} />
        </div>
      ) : null}

      <form action={accion} className="mt-5 flex flex-col gap-4">
        <input name="eventId" type="hidden" value={eventId} />
        <input name="eventSlug" type="hidden" value={eventSlug} />

        <Field htmlFor={idNombre} label="Nombre completo">
          <input autoFocus className={FIELD_CLASS} id={idNombre} maxLength={160} name="fullName" required type="text" />
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className={`${LABEL_CLASS} mb-2`}>Cómo le llega la invitación</legend>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-[14px] border border-line-panel-strong bg-white px-4 py-3 transition-colors has-checked:border-ink has-checked:bg-bg-top">
            <input
              checked={modo === 'propia'}
              className="mt-0.5 size-4"
              name="modo"
              onChange={() => setModo('propia')}
              type="radio"
              value="propia"
            />
            <span className="flex flex-col text-[13px] text-ink">
              Invitación propia
              <span className="text-[12px] text-ink-mute">
                Recibe su propio enlace. Si viene acompañado, se le suman pases abajo.
              </span>
            </span>
          </label>

          {groups.length === 0 ? null : (
            <label className="flex cursor-pointer items-start gap-2.5 rounded-[14px] border border-line-panel-strong bg-white px-4 py-3 transition-colors has-checked:border-ink has-checked:bg-bg-top">
              <input
                checked={modo === 'grupo'}
                className="mt-0.5 size-4"
                name="modo"
                onChange={() => setModo('grupo')}
                type="radio"
                value="grupo"
              />
              <span className="flex flex-col text-[13px] text-ink">
                Se suma a una invitación ya creada
                <span className="text-[12px] text-ink-mute">
                  Comparte el enlace, los cupos y la mesa con su familia o su grupo.
                </span>
              </span>
            </label>
          )}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          {modo === 'grupo' ? (
            <Field htmlFor={idGrupo} label="A qué invitación se suma">
              <select
                className={FIELD_CLASS}
                id={idGrupo}
                name="groupId"
                onChange={(e) => setGrupo(e.target.value)}
                value={grupo}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label} · {g.free === 0 ? 'sin cupos libres' : `${g.free} cupo${g.free === 1 ? '' : 's'} libre${g.free === 1 ? '' : 's'}`}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field
              hint="Vacío, se llama como el invitado."
              htmlFor={idNuevo}
              label="Nombre de la invitación"
            >
              <input
                className={FIELD_CLASS}
                id={idNuevo}
                maxLength={160}
                name="newGroupLabel"
                placeholder="El nombre del invitado"
                type="text"
              />
            </Field>
          )}

          <Field
            hint="Pases además del suyo: pareja, hijos. 0 si viene solo."
            htmlFor={idAcomp}
            label="Acompañantes"
          >
            <input className={FIELD_CLASS} defaultValue={0} id={idAcomp} min={0} name="companions" type="number" />
          </Field>
        </div>

        {notice === undefined ? null : <div>{notice}</div>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor={idRsvp} label="RSVP">
            <select className={FIELD_CLASS} id={idRsvp} name="attending">
              <option value="">Pendiente</option>
              <option value="yes">Asistirá</option>
              <option value="no">No podrá</option>
              <option value="maybe">Tal vez</option>
            </select>
          </Field>

          <Field htmlFor={idDieta} label="Restricciones">
            <input
              className={FIELD_CLASS}
              id={idDieta}
              maxLength={200}
              name="dietaryNote"
              placeholder="Vegano, sin gluten…"
              type="text"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor={idTel} label="WhatsApp / Teléfono">
            <CampoTelefono id={idTel} name="phone" onChange={setTelefono} value={telefono} />
          </Field>

          <Field htmlFor={idCorreo} label="Email">
            <input
              className={FIELD_CLASS}
              id={idCorreo}
              maxLength={160}
              name="email"
              placeholder="correo@ejemplo.com"
              type="email"
            />
          </Field>
        </div>

        <label className="flex items-center gap-2.5 text-[13px] text-ink" htmlFor={idVip}>
          <input className="size-4" id={idVip} name="vip" type="checkbox" />
          <span className="flex flex-col">
            Invitado VIP
            <span className="text-[12px] text-ink-mute">Se marca en la lista, se filtra aparte y su silla sale en dorado en el plano del salón.</span>
          </span>
        </label>

        {estado.status === 'error' ? (
          <p className="text-[13px] text-danger" role="alert">
            {estado.message}
          </p>
        ) : null}

        <div className="mt-2 flex justify-end gap-2.5">
          {/* Cierra el diálogo **y** navega: solo navegar deja el modal abierto encima de
              la lista hasta que Next termina la transición, y con él la página bloqueada. */}
          <PanelButton onClick={cerrar}>{hayEnlace ? 'Cerrar' : 'Cancelar'}</PanelButton>
          <SubmitButton variant="primary" disabled={pendiente || (nuevoGrupo && atLimit)} pending={pendiente} pendingLabel={'Guardando…'}>{'Guardar'}</SubmitButton>
        </div>
      </form>
    </dialog>
  )
}
