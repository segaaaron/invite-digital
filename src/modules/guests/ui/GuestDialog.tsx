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
  const router = useRouter()
  const dialogo = useRef<HTMLDialogElement>(null)
  const [estado, accion, pendiente] = useActionState<GuestActionState, FormData>(addGuestAction, INICIAL)
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
  const idGrupo = useId()
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

  // Guardar cierra el diálogo, como en la maqueta. El enlace no se enseña aquí: se prepara
  // al mandarlo, desde «Enviar invitaciones», que es donde se reparte.
  useEffect(() => {
    if (estado.status === 'success') {
      dialogo.current?.close()
      router.replace(closeHref)
    }
  }, [estado, closeHref, router])

  const cerrar = () => {
    dialogo.current?.close()
    router.replace(closeHref)
  }

  // Toda alta crea su invitación, así que toda alta cuenta contra el tope del plan.
  const nuevoGrupo = true

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

      <form action={accion} className="mt-5 flex flex-col gap-4">
        <input name="eventId" type="hidden" value={eventId} />
        <input name="eventSlug" type="hidden" value={eventSlug} />

        <Field htmlFor={idNombre} label="Nombre completo">
          <input autoFocus className={FIELD_CLASS} id={idNombre} maxLength={160} name="fullName" required type="text" />
        </Field>

        <Field htmlFor={idGrupo} label="Tipo de invitación">
          <select
            className={FIELD_CLASS}
            id={idGrupo}
            onChange={(e) => {
              setTipo(e.target.value)
              // Al pasar a «Acompañado» hay que poder escribir ya: sin una fila, la pantalla
              // se queda con un botón y nada donde teclear.
              if (e.target.value === 'acompanado' && acompanantes.length === 0) setAcompanantes([''])
            }}
            value={tipo}
          >
            <option value="personal">Personal</option>
            <option value="acompanado">Acompañado</option>
          </select>
        </Field>

        {tipo === 'personal' ? null : (
          <div className="flex flex-col gap-2">
            <span className={LABEL_CLASS}>Acompañantes</span>
            {/* De cada acompañante **solo el nombre**. Lo demás —su comida, su confirmación—
                se edita luego desde su fila, como en cualquier otro invitado. */}
            {acompanantes.map((valor, indice) => (
              <span className="flex min-w-0 gap-2" key={indice}>
                <label className="sr-only" htmlFor={`${idAcomp}-${indice}`}>
                  Nombre del acompañante {indice + 1}
                </label>
                <input
                  className={`${FIELD_CLASS} min-w-0 flex-1`}
                  id={`${idAcomp}-${indice}`}
                  maxLength={160}
                  name="companionName"
                  onChange={(e) =>
                    setAcompanantes((previos) => previos.map((p, i) => (i === indice ? e.target.value : p)))
                  }
                  placeholder="Nombre completo"
                  type="text"
                  value={valor}
                />
                <PanelButton
                  aria-label={`Quitar acompañante ${indice + 1}`}
                  onClick={() => setAcompanantes((previos) => previos.filter((_, i) => i !== indice))}
                >
                  Quitar
                </PanelButton>
              </span>
            ))}
            <div>
              <PanelButton onClick={() => setAcompanantes((previos) => [...previos, ''])}>
                Añadir acompañante
              </PanelButton>
            </div>
          </div>
        )}

        {notice === undefined ? null : <div>{notice}</div>}

        {/* Sin RSVP al crear: la asistencia la decide el invitado desde su invitación. */}
        <div>
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
          <PanelButton onClick={cerrar}>Cancelar</PanelButton>
          <SubmitButton variant="primary" disabled={pendiente || (nuevoGrupo && atLimit)} pending={pendiente} pendingLabel={'Guardando…'}>{'Guardar'}</SubmitButton>
        </div>
      </form>
    </dialog>
  )
}
