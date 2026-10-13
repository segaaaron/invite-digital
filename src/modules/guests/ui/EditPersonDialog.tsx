'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { FIELD_CLASS, Field, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { CampoTelefono } from '@/shared/design/ui/panel/CampoTelefono'
import { addPersonAction, ensureInvitationLinkAction, reopenRsvpAction, setGroupPhoneAction, updatePersonAction } from '@/app/_acciones/guests/actions'
import type { Attendance } from '../domain/person'
import { RevokeInvitationForm } from './RevokeInvitationForm'
import { conCanal } from '../domain/invitation-url'
import { CloseIcon, CopyIcon, QrIcon } from '@/shared/design/ui/icons'

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
}

/** La invitación de la persona: el enlace, que es lo que se revoca y lo que se reabre. */
export type InvitationOfPerson = {
  readonly id: string
  readonly label: string
  readonly revocada: boolean
  /** Ya contestó: solo entonces hay algo que reabrir. */
  readonly respondida: boolean
  /** El enlace que se le envió, si está guardado. Se enseña, no se edita. */
  readonly enlace?: string | null
  /** El código corto de su pase. */
  readonly codigo?: string | null
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
 * El teléfono es el único campo que no es de la persona: pertenece a la invitación, que es
 * quien recibe el enlace. Solo se manda si cambió.
 *
 * Debajo, lo que es de su invitación: sumarle un acompañante, reabrir la confirmación si
 * se equivocaron al contestar y revocar el enlace. Principal o acompañante no se elige: lo
 * decide la invitación, y elegirlo a mano dejaba invitaciones con dos principales o sin
 * ninguno.
 */
export function EditPersonDialog({
  person,
  groups,
  invitacion,
  eventSlug,
  closeHref,
}: {
  person: EditablePerson
  groups: readonly GroupChoice[]
  invitacion: InvitationOfPerson
  eventSlug: string
  closeHref: string
}) {
  const router = useRouter()
  const dialogo = useRef<HTMLDialogElement>(null)
  const [fullName, setFullName] = useState(person.fullName)
  const [copiado, setCopiado] = useState(false)
  const [enlaceNuevo, setEnlaceNuevo] = useState<string | null>(null)
  const [groupId, setGroupId] = useState(person.groupId)
  const [attending, setAttending] = useState<string>(person.attending ?? '')
  const [dietaryNote, setDietaryNote] = useState(person.dietaryNote ?? '')
  const [phone, setPhone] = useState(person.phone ?? '')
  const [email, setEmail] = useState(person.email ?? '')
  const [vip, setVip] = useState(person.vip)
  const [acompanante, setAcompanante] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
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
          setError(t.message ?? 'Se guardó el invitado, pero no su teléfono.')
          return
        }
      }

      cerrar()
    })
  }

  /** Lo de la invitación se guarda al pulsar, sin «Guardar»: no es un campo de la persona. */
  /**
   * El enlace **siempre** se enseña. Una invitación de antes de `0062` no guardó el suyo: el
   * servidor le acuña uno y conserva el viejo, que sigue abriendo. Se pide al abrir el diálogo.
   */
  useEffect(() => {
    if (invitacion.enlace || invitacion.revocada) return
    let vigente = true
    void ensureInvitationLinkAction({ eventSlug, groupId: invitacion.id }).then((r) => {
      if (!vigente) return
      if (r.status === 'success') setEnlaceNuevo(r.url)
      else setError(r.message)
    })
    return () => {
      vigente = false
    }
  }, [eventSlug, invitacion.enlace, invitacion.id, invitacion.revocada])

  const enInvitacion = (hacer: () => Promise<{ status: string; message?: string }>, hecho: string) => {
    setError(null)
    setAviso(null)
    empezar(async () => {
      const r = await hacer()
      if (r.status === 'error') setError(r.message ?? 'No se pudo guardar el cambio.')
      else setAviso(hecho)
    })
  }

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={`${idNombre}-titulo`}
      // Desde 1024 px, **al lado de la lista** (panel lateral, la lista se sigue viendo: maqueta 7 del panel
      // móvil); en el teléfono, hoja desde abajo. En medio, centrado.
      className="m-auto w-[min(560px,94vw)] max-w-none overflow-y-auto border border-line-panel bg-bg p-7 text-ink shadow-float backdrop:bg-shell-deep/50 max-[767px]:mb-0 max-[767px]:max-h-[92dvh] max-[767px]:w-screen max-[767px]:rounded-t-[20px] max-[767px]:p-5 min-[768px]:fixed min-[768px]:inset-y-0 min-[768px]:right-0 min-[768px]:left-auto min-[768px]:m-0 min-[768px]:h-dvh min-[768px]:max-h-dvh min-[768px]:w-[min(520px,100vw)] min-[768px]:border-y-0 min-[768px]:border-r-0"
      onCancel={(e) => {
        e.preventDefault()
        cerrar()
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-[14px] text-ink-mute">Invitación «{invitacion.label}»</p>
          <h2 className="font-display text-[30px] leading-tight font-medium" id={`${idNombre}-titulo`}>
            Editar invitado
          </h2>
        </div>
        <button
          aria-label="Cerrar"
          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-[10px] border border-line-panel-strong bg-bg-raised hover:border-gold"
          onClick={cerrar}
          type="button"
        >
          <CloseIcon className="size-4" />
        </button>
      </div>

      {/* El pase arriba (E36): el código que se dicta en la puerta y su enlace para copiar. */}
      {invitacion.revocada || (!invitacion.codigo && !(enlaceNuevo ?? invitacion.enlace)) ? null : (
        <div className="mt-5 flex items-center gap-4 rounded-[14px] border border-line-panel bg-bg-raised px-4 py-3.5">
          <QrIcon className="size-8 shrink-0 text-ink" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-[13px] text-ink-mute">Código del pase</span>
            {invitacion.codigo ? <span className="font-display text-[26px] leading-tight font-medium tracking-[0.08em]">{invitacion.codigo}</span> : null}
            {(enlaceNuevo ?? invitacion.enlace) ? (
              <input
                aria-label="Enlace de su invitación"
                className="w-full min-w-0 truncate bg-transparent text-[12.5px] text-ink-mute outline-none"
                onFocus={(e) => e.currentTarget.select()}
                readOnly
                value={conCanal(enlaceNuevo ?? invitacion.enlace ?? '', 'enlace')}
              />
            ) : null}
          </div>
          {(enlaceNuevo ?? invitacion.enlace) ? (
            <button
              className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-[10px] border border-line-panel-strong bg-bg px-3 text-[13.5px] font-medium hover:border-gold"
              onClick={() => {
                void navigator.clipboard?.writeText(conCanal(enlaceNuevo ?? invitacion.enlace ?? '', 'enlace'))
                setCopiado(true)
              }}
              type="button"
            >
              <CopyIcon className="size-4" />
              {copiado ? 'Copiado' : 'Copiar enlace'}
            </button>
          ) : null}
        </div>
      )}

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

        <div>
          <Field htmlFor={idGrupo} label="Invitación">
            <select className={FIELD_CLASS} id={idGrupo} onChange={(e) => setGroupId(e.target.value)} value={groupId}>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
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
            <CampoTelefono id={idTel} onChange={setPhone} value={phone} />
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

      <section aria-labelledby={`${idAcomp}-titulo`} className="mt-6 flex flex-col gap-3 border-t border-line-panel pt-5">
        <h3 className="text-[15px] font-medium" id={`${idAcomp}-titulo`}>
          Su invitación
        </h3>

        <div className="flex min-w-0 gap-2">
          <label className="sr-only" htmlFor={idAcomp}>
            Nombre del acompañante nuevo
          </label>
          <input
            className={`${FIELD_CLASS} min-w-0 flex-1`}
            id={idAcomp}
            maxLength={160}
            onChange={(e) => setAcompanante(e.target.value)}
            placeholder="Nombre del acompañante"
            type="text"
            value={acompanante}
          />
          <PanelButton
            disabled={pendiente || acompanante.trim() === ''}
            onClick={() =>
              enInvitacion(async () => {
                const r = await addPersonAction({ eventSlug, guestGroupId: invitacion.id, fullName: acompanante.trim() })
                if (r.status === 'success') setAcompanante('')
                return r
              }, 'Acompañante añadido.')
            }
          >
            Añadir acompañante
          </PanelButton>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          {invitacion.respondida ? (
            <PanelButton
              disabled={pendiente}
              onClick={() => enInvitacion(() => reopenRsvpAction({ eventSlug, id: invitacion.id }), 'Puede volver a confirmar desde su enlace.')}
            >
              Reabrir confirmación
            </PanelButton>
          ) : (
            <span />
          )}
          {invitacion.revocada ? (
            <span className="text-[12px] text-ink-mute">Enlace revocado: ya no abre.</span>
          ) : (
            <RevokeInvitationForm eventSlug={eventSlug} groupId={invitacion.id} />
          )}
        </div>

        {aviso === null ? null : (
          <p className="text-[13px] text-ink-soft" role="status">
            {aviso}
          </p>
        )}
      </section>

      {error === null ? null : (
        <p className="mt-4 text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-2.5">
        <PanelButton disabled={pendiente} onClick={cerrar}>
          Cancelar
        </PanelButton>
        <PanelButton variant="primary" disabled={pendiente} onClick={guardar} aria-busy={(pendiente) || undefined}>
          {pendiente ? 'Guardando…' : 'Guardar'}
        </PanelButton>
      </div>
    </dialog>
  )
}
