'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { FIELD_CLASS, Field, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { setGroupPhoneAction, updatePersonAction } from '../actions'
import type { Attendance } from '../domain/person'

export type EditablePerson = {
  readonly id: string
  readonly fullName: string
  readonly groupId: string
  readonly isCompanion: boolean
  readonly dietaryNote: string | null
  readonly vip: boolean
  readonly attending: Attendance | null
  readonly email: string | null
  /** El teléfono vive en el grupo: identifica a quien recibe el enlace, no a la persona. */
  readonly phone: string | null
}

export type GroupChoice = {
  readonly id: string
  readonly label: string
  readonly free: number
}

/** Vacío es «no hay dato», no una cadena en blanco que luego el catering agruparía. */
const oNulo = (valor: string): string | null => (valor.trim() === '' ? null : valor.trim())

/**
 * El «✎» de la fila: el mismo formulario de la maqueta, relleno con lo que la persona ya
 * tiene.
 *
 * Se abre por la dirección (`?panel=editar&persona=…`) y no con estado del cliente:
 * guardar revalida el árbol y remonta la tabla, y un `useState` se perdería en ese
 * remontaje —es lo que ya pasó con el conmutador de la mesa de regalos—.
 *
 * El teléfono es el único campo que no es de la persona: pertenece al grupo, que es quien
 * recibe el enlace. Solo se manda si cambió, para no reescribir el del grupo entero cada
 * vez que alguien corrige una restricción alimentaria.
 */
export function EditPersonDialog({
  person,
  groups,
  eventSlug,
  closeHref,
}: {
  person: EditablePerson
  groups: readonly GroupChoice[]
  eventSlug: string
  closeHref: string
}) {
  const router = useRouter()
  const dialogo = useRef<HTMLDialogElement>(null)
  const [fullName, setFullName] = useState(person.fullName)
  const [groupId, setGroupId] = useState(person.groupId)
  const [isCompanion, setIsCompanion] = useState(person.isCompanion)
  const [attending, setAttending] = useState<string>(person.attending ?? '')
  const [dietaryNote, setDietaryNote] = useState(person.dietaryNote ?? '')
  const [phone, setPhone] = useState(person.phone ?? '')
  const [email, setEmail] = useState(person.email ?? '')
  const [vip, setVip] = useState(person.vip)
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  const idNombre = useId()
  const idGrupo = useId()
  const idAcomp = useId()
  const idRsvp = useId()
  const idDieta = useId()
  const idTel = useId()
  const idCorreo = useId()
  const idVip = useId()

  // `showModal()` es lo único que sube el diálogo a la capa superior y hace inerte el
  // fondo. Con el atributo `open` del marcado se pinta dentro del flujo: parece abierto,
  // pero los elementos de detrás siguen recibiendo los clics —la e2e cazó justo eso, una
  // píldora de la tabla interceptando el botón «Guardar»—.
  useEffect(() => {
    const nodo = dialogo.current
    if (nodo !== null && !nodo.open) nodo.showModal()
  }, [])

  const cerrar = () => {
    dialogo.current?.close()
    // `replace`, no `push`: con `push`, volver atrás reabre el diálogo.
    router.replace(closeHref)
  }

  const guardar = () => {
    setError(null)
    empezar(async () => {
      const r = await updatePersonAction({
        eventSlug,
        id: person.id,
        fullName: fullName.trim(),
        guestGroupId: groupId,
        isCompanion,
        attending: attending === '' ? null : attending,
        dietaryNote: oNulo(dietaryNote),
        email: oNulo(email),
        vip,
      })
      if (r.status === 'error') {
        setError(r.message ?? 'No se pudo guardar el cambio.')
        return
      }

      if ((person.phone ?? '') !== phone) {
        const t = await setGroupPhoneAction({
          eventSlug,
          id: groupId,
          phone: phone.trim(),
        })
        if (t.status === 'error') {
          setError(t.message ?? 'Se guardó el invitado, pero no el teléfono del grupo.')
          return
        }
      }

      cerrar()
    })
  }

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={`${idNombre}-titulo`}
      className="m-auto w-[min(560px,94vw)] rounded-[18px] border border-line-panel bg-bg-raised p-7 text-ink shadow-float backdrop:bg-ink/45"
      onCancel={(e) => {
        e.preventDefault()
        cerrar()
      }}
    >
      <h2 className="font-display text-[24px] font-light italic" id={`${idNombre}-titulo`}>
        Editar invitado
      </h2>

      <div className="mt-5 flex flex-col gap-4">
        <Field htmlFor={idNombre} label="Nombre completo">
          <input
            autoFocus
            className={FIELD_CLASS}
            id={idNombre}
            maxLength={160}
            onChange={(e) => setFullName(e.target.value)}
            type="text"
            value={fullName}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor={idGrupo} label="Grupo">
            <select className={FIELD_CLASS} id={idGrupo} onChange={(e) => setGroupId(e.target.value)} value={groupId}>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label} · {g.free} libre{g.free === 1 ? '' : 's'}
                </option>
              ))}
            </select>
          </Field>

          <Field htmlFor={idAcomp} label="Acompañante">
            <select
              className={FIELD_CLASS}
              id={idAcomp}
              onChange={(e) => setIsCompanion(e.target.value === 'si')}
              value={isCompanion ? 'si' : 'no'}
            >
              <option value="no">Invitado principal</option>
              <option value="si">Acompañante</option>
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor={idRsvp} label="RSVP">
            <select
              className={FIELD_CLASS}
              id={idRsvp}
              onChange={(e) => setAttending(e.target.value)}
              value={attending}
            >
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
              onChange={(e) => setDietaryNote(e.target.value)}
              placeholder="Vegano, sin gluten…"
              type="text"
              value={dietaryNote}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor={idTel} label="WhatsApp / Teléfono">
            <input
              className={FIELD_CLASS}
              id={idTel}
              maxLength={32}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+591 700 00000"
              type="tel"
              value={phone}
            />
          </Field>

          <Field htmlFor={idCorreo} label="Email">
            <input
              className={FIELD_CLASS}
              id={idCorreo}
              maxLength={160}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              type="email"
              value={email}
            />
          </Field>
        </div>

        <label className="flex items-center gap-2.5 text-[13px] text-ink" htmlFor={idVip}>
          <input
            checked={vip}
            className="size-4"
            id={idVip}
            onChange={(e) => setVip(e.target.checked)}
            type="checkbox"
          />
          Invitado VIP
        </label>
      </div>

      {error === null ? null : (
        <p className="mt-4 text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-2.5">
        <PanelButton disabled={pendiente} onClick={cerrar}>
          Cancelar
        </PanelButton>
        <PanelButton variant="primary" disabled={pendiente} onClick={guardar}>
          {pendiente ? 'Guardando…' : 'Guardar'}
        </PanelButton>
      </div>
    </dialog>
  )
}
