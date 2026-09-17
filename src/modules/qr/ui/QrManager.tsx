'use client'

import { QrIcon } from '@/shared/design/ui/icons'
import { useActionState, useId, useState } from 'react'
import { PanelButton, Pill, FIELD_CLASS, LABEL_CLASS } from '@/shared/design/ui/panel/PanelKit'
import { QrCodeSvg } from '@/shared/design/ui/QrCodeSvg'
import { printMarkedOnly } from '@/shared/design/ui/print'
import { createQrCodeAction, toggleQrCodeAction, updateQrCodeAction, type QrActionState } from '@/app/_acciones/qr/actions'
import { SubmitButton, EmptyState } from '@/shared/design/ui/panel/estados'

const INICIAL: QrActionState = { status: 'idle' }

export type QrView = {
  readonly id: string
  readonly label: string
  readonly kind: string
  readonly target: string
  readonly active: boolean
  readonly scanCount: number
  readonly url: string
}

const TIPO: Record<string, string> = {
  registry: 'Mesa de regalos',
  store: 'Tienda',
  custom: 'Otro destino',
}

/**
 * El motor de QR, visto desde el panel.
 *
 * Cada código apunta a **nosotros** (`/r/<id>`) y redirige. Eso es lo que permite cambiar
 * el destino de algo ya impreso y contar los escaneos: un QR con la dirección final dentro
 * queda muerto el día que esa tienda cambia el enlace, y para entonces está colgado en el
 * salón.
 */
export function QrManager({
  eventId,
  eventSlug,
  eventTitle,
  codes,
}: {
  eventId: string
  eventSlug: string
  eventTitle: string
  codes: readonly QrView[]
}) {
  const [alta, crear, creando] = useActionState<QrActionState, FormData>(createQrCodeAction, INICIAL)
  const id = useId()

  return (
    <div className="flex flex-col gap-6">
      <form action={crear} className="flex flex-col gap-4">
        <input name="eventId" type="hidden" value={eventId} />
        <input name="eventSlug" type="hidden" value={eventSlug} />

        <div className="grid gap-4 min-[560px]:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-2">
            <label className={LABEL_CLASS} htmlFor={`${id}-label`}>
              Para qué es
            </label>
            <input
              className={FIELD_CLASS}
              id={`${id}-label`}
              name="label"
              placeholder="Mesa de regalos"
              required
              type="text"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className={LABEL_CLASS} htmlFor={`${id}-kind`}>
              Tipo
            </label>
            <select className={FIELD_CLASS} defaultValue="registry" id={`${id}-kind`} name="kind">
              <option value="registry">Mesa de regalos</option>
              <option value="store">Tienda</option>
              <option value="custom">Otro destino</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className={LABEL_CLASS} htmlFor={`${id}-target`}>
            A dónde lleva
          </label>
          <input
            className={`${FIELD_CLASS} font-mono text-[13px]`}
            id={`${id}-target`}
            name="target"
            placeholder="https://tienda.com/lista  ·  o una ruta nuestra como /es/colecciones"
            required
            type="text"
          />
          <span className="text-[11px] leading-[1.7] text-ink-mute">
            Puedes cambiarlo después sin reimprimir nada: el código apunta aquí, no allá.
          </span>
        </div>

        {alta.status === 'error' ? (
          <p className="text-[13px] text-danger" role="alert">
            {alta.message}
          </p>
        ) : null}

        <SubmitButton className="w-fit" variant="primary" pending={creando} pendingLabel={'Creando…'}>{'+ Crear código'}</SubmitButton>
      </form>

      {codes.length === 0 ? (
        <EmptyState
          compact
          description="Un código impreso que lleva adonde quieras y se puede cambiar después. El primero suele ser el de la mesa de regalos."
          icon={<QrIcon />}
          title="Aún no creaste códigos QR"
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-panel pt-6">
            <p className="text-[12px] text-ink-soft">
              {codes.length} código{codes.length === 1 ? '' : 's'} · los escaneos se cuentan solos
            </p>
            <PanelButton className="print:hidden" onClick={printMarkedOnly}>
              Imprimir carteles
            </PanelButton>
          </div>

          <ul className="flex flex-col gap-3">
            {codes.map((code) => (
              <QrRow key={code.id} code={code} eventId={eventId} eventSlug={eventSlug} />
            ))}
          </ul>

          {/* La hoja de carteles: un QR grande por código, para colgar en el salón. La
              regla de tamaño es 1 cm de ancho por cada 10 cm de distancia de lectura, así
              que un cartel sobre una mesa pide bastante más que una tarjeta en la mano. */}
          <section className="hidden print:block" data-para-imprimir>
            <h2 className="mb-6 font-display text-[26px] font-light">{eventTitle}</h2>
            <ul className="grid grid-cols-2 gap-8">
              {codes
                .filter((code) => code.active)
                .map((code) => (
                  <li key={code.id} className="flex break-inside-avoid flex-col items-center gap-3 text-center">
                    <QrCodeSvg className="w-full max-w-[260px]" label={code.label} url={code.url} />
                    <span className="font-display text-[22px] italic">{code.label}</span>
                  </li>
                ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}

function QrRow({ code, eventId, eventSlug }: { code: QrView; eventId: string; eventSlug: string }) {
  const [edicion, editar, editando] = useActionState<QrActionState, FormData>(updateQrCodeAction, INICIAL)
  const [estado, alternar, alternando] = useActionState<QrActionState, FormData>(toggleQrCodeAction, INICIAL)
  const [abierto, setAbierto] = useState(false)
  const id = useId()

  const error = edicion.status === 'error' ? edicion.message : estado.status === 'error' ? estado.message : null

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-line-panel bg-white p-4">
      <div className="flex flex-wrap items-center gap-4">
        <QrCodeSvg className="w-20 shrink-0" label={`Código de ${code.label}`} url={code.url} />

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] text-ink">{code.label}</span>
            <Pill tone={code.active ? 'ok' : 'no'}>{code.active ? 'Activo' : 'Apagado'}</Pill>
            <Pill tone="pending">{TIPO[code.kind] ?? code.kind}</Pill>
          </span>
          <span className="mt-1 block truncate font-mono text-[11px] text-ink-mute">{code.target}</span>
          <span className="mt-0.5 block text-[11px] text-ink-mute">
            {code.scanCount} escaneo{code.scanCount === 1 ? '' : 's'}
          </span>
        </span>

        <PanelButton onClick={() => setAbierto((previo) => !previo)}>{abierto ? 'Cerrar' : 'Editar'}</PanelButton>

        <form action={alternar}>
          <input name="eventId" type="hidden" value={eventId} />
          <input name="eventSlug" type="hidden" value={eventSlug} />
          <input name="id" type="hidden" value={code.id} />
          <input name="active" type="hidden" value={code.active ? 'false' : 'true'} />
          {/* Apagar, no borrar: el cartel sigue en la pared, y quien lo escanee tiene que
              encontrarse un «ya no está disponible», no una redirección a cualquier parte. */}
          <PanelButton disabled={alternando} title="El cartel impreso deja de llevar a ninguna parte" type="submit">
            {code.active ? 'Apagar' : 'Encender'}
          </PanelButton>
        </form>
      </div>

      {error === null ? null : (
        <p className="text-[12px] text-danger" role="alert">
          {error}
        </p>
      )}

      {abierto ? (
        <form action={editar} className="flex flex-col gap-3 border-t border-line-panel pt-3.5">
          <input name="eventId" type="hidden" value={eventId} />
          <input name="eventSlug" type="hidden" value={eventSlug} />
          <input name="id" type="hidden" value={code.id} />

          <div className="grid gap-3 min-[560px]:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className={LABEL_CLASS} htmlFor={`${id}-label`}>
                Para qué es
              </label>
              <input className={FIELD_CLASS} defaultValue={code.label} id={`${id}-label`} name="label" type="text" />
            </div>
            <div className="flex flex-col gap-2">
              <label className={LABEL_CLASS} htmlFor={`${id}-target`}>
                A dónde lleva
              </label>
              <input
                className={`${FIELD_CLASS} font-mono text-[13px]`}
                defaultValue={code.target}
                id={`${id}-target`}
                name="target"
                type="text"
              />
            </div>
          </div>

          <SubmitButton className="w-fit" variant="primary" pending={editando} pendingLabel={'Guardando…'}>{'Guardar'}</SubmitButton>
        </form>
      ) : null}
    </li>
  )
}
