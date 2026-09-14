'use client'

import Link from 'next/link'
import { useActionState, useId } from 'react'
import { FIELD_CLASS, LABEL_CLASS, PanelAlert, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { createWeddingForClientAction, type NuevaBodaState } from '../actions'

const INICIAL: NuevaBodaState = { status: 'idle' }

export type ModeloElegible = { readonly key: string; readonly label: string; readonly categoria: string }
export type PlanElegible = { readonly slug: string; readonly nombre: string }

/**
 * Crear la boda de un cliente: su modelo, su evento y su acceso, en un solo paso.
 *
 * Es el camino que recorre aprobar un pedido, **sin pedido**: el cliente llegó por
 * WhatsApp, eligió una tarjeta del catálogo y el admin se la monta.
 *
 * **El modelo va primero, y no es orden estético.** Es lo que el cliente eligió mirando la
 * web, y lo que decide cómo se va a ver su invitación desde el primer segundo: el contenido
 * de muestra de ese diseño se siembra al crearla.
 *
 * La contraseña **se escribe aquí y no se vuelve a mostrar**: de ella solo queda su argon2,
 * como los enlaces de invitado. Se la mandamos por correo al cliente en cuanto se crea.
 */
export function NuevaBodaForm({ modelos, planes }: { modelos: readonly ModeloElegible[]; planes: readonly PlanElegible[] }) {
  // Agrupados por tipo de evento: una lista plana mezclaba bodas y XV y no decía que aquí
  // se crea cualquiera de los dos.
  const grupos = [...new Set(modelos.map((m) => m.categoria))].map((categoria) => ({
    categoria,
    modelos: modelos.filter((m) => m.categoria === categoria),
  }))
  const [estado, crear, creando] = useActionState<NuevaBodaState, FormData>(createWeddingForClientAction, INICIAL)
  const id = useId()

  return (
    <form action={crear} className="flex flex-col gap-4.5">
      <p className="text-[12px] leading-[1.7] text-ink-soft">
        Crea el evento —una boda, unos XV años— con el diseño que el cliente eligió y dale acceso al panel de una vez.
        El tipo lo decide el modelo. Entrará y verá <strong className="font-normal text-ink">solo su evento</strong>: sus invitados, las confirmaciones, las mesas, la
        mesa de regalos y los mensajes, y podrá escribir su invitación y subir su canción. Nada de administración.
      </p>

      <div className="grid gap-4 min-[560px]:grid-cols-2">
        <div className="flex flex-col gap-2 min-[560px]:col-span-2">
          <label className={LABEL_CLASS} htmlFor={`${id}-modelo`}>
            Modelo que eligió
          </label>
          <select className={FIELD_CLASS} id={`${id}-modelo`} name="themeKey" required>
            {grupos.map((grupo) => (
              <optgroup key={grupo.categoria} label={grupo.categoria}>
                {grupo.modelos.map((modelo) => (
                  <option key={modelo.key} value={modelo.key}>
                    {modelo.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="text-[11px] text-ink-mute">
            Se puede cambiar después en Configuración del evento, y cambiarlo no se lleva por delante lo escrito.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className={LABEL_CLASS} htmlFor={`${id}-titulo`}>
            Nombre del evento
          </label>
          <input
            className={FIELD_CLASS}
            id={`${id}-titulo`}
            maxLength={160}
            name="title"
            placeholder="Boda de Ana y Luis · XV de Valeria"
            required
            type="text"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={LABEL_CLASS} htmlFor={`${id}-fecha`}>
            Fecha del evento
          </label>
          <input className={FIELD_CLASS} id={`${id}-fecha`} name="eventDate" required type="date" />
        </div>

        <div className="flex flex-col gap-2">
          <label className={LABEL_CLASS} htmlFor={`${id}-plan`}>
            Plan
          </label>
          <select className={FIELD_CLASS} id={`${id}-plan`} name="planSlug">
            {planes.map((plan) => (
              <option key={plan.slug} value={plan.slug}>
                {plan.nombre}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-ink-mute">
            Decide qué trae su panel —mesa de regalos, modo puerta, tope de invitados—. Se cambia después en su fila, en «Gestionar».
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className={LABEL_CLASS} htmlFor={`${id}-correo`}>
            Correo del cliente
          </label>
          <input
            autoComplete="off"
            className={FIELD_CLASS}
            id={`${id}-correo`}
            name="clientEmail"
            placeholder="cliente@correo.com"
            required
            type="email"
          />
        </div>

        <div className="flex flex-col gap-2 min-[560px]:col-span-2">
          <label className={LABEL_CLASS} htmlFor={`${id}-clave`}>
            Contraseña inicial
          </label>
          <input autoComplete="new-password" className={FIELD_CLASS} id={`${id}-clave`} name="clientPassword" type="text" />
          <p className="text-[11px] leading-[1.5] text-ink-mute">
            No se vuelve a mostrar: cópiala antes de salir. Se la mandamos por correo, y la primera vez que entre el
            panel no se abre hasta que elija una suya. Si ese correo ya tiene cuenta, se le da acceso sin tocarle la
            contraseña.
          </p>
        </div>
      </div>

      {estado.status === 'error' ? <PanelAlert tone="error">{estado.message}</PanelAlert> : null}
      {estado.status === 'success' ? (
        <PanelAlert tone="ok">
          {estado.message}{' '}
          <Link className="underline underline-offset-4" href={`/panel/eventos/${estado.eventSlug}/configuracion`}>
            Abrir su invitación
          </Link>
        </PanelAlert>
      ) : null}

      <div>
        <PanelButton disabled={creando} type="submit" variant="primary">
          {creando ? 'Creando…' : 'Crear el evento y su acceso'}
        </PanelButton>
      </div>
    </form>
  )
}
