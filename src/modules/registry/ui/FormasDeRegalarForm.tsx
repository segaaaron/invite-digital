'use client'

import { useActionState, useId, useState } from 'react'
import { guardarFormasDeRegalarAction, type FormasState } from '@/app/_acciones/registry/formas-actions'
import { SettingsSection, SwitchRow } from '@/shared/design/ui/panel/ajustes'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { FIELD_CLASS, LABEL_CLASS } from '@/shared/design/ui/panel/PanelKit'
import { TOPES, type FormasDeRegalar } from '../domain/formas-de-regalar'

const INICIAL: FormasState = { status: 'idle' }

/**
 * La lluvia de sobres y la transferencia con su QR, en el panel. En todos los planes: es como más
 * se regala en Bolivia. El dinero va directo a la cuenta del cliente; nosotros no cobramos nada.
 */
export function FormasDeRegalarForm({
  eventId,
  eventSlug,
  formas,
  sobresPorDefecto,
}: {
  eventId: string
  eventSlug: string
  formas: FormasDeRegalar
  /** La frase que ve el invitado si no se escribe otra. */
  sobresPorDefecto: string
}) {
  const [estado, accion, pendiente] = useActionState(guardarFormasDeRegalarAction, INICIAL)
  const id = useId()
  const [quitarQr, setQuitarQr] = useState(false)
  // Tras un error, lo escrito vuelve de la acción: React vacía el formulario igual.
  const v = estado.status === 'error' && estado.valores ? estado.valores : null
  const valor = (campo: keyof FormasDeRegalar & string) => v?.[campo] ?? (typeof formas[campo] === 'string' ? (formas[campo] as string) : '')
  const encendido = (campo: 'sobres' | 'transferencia') => (v === null ? formas[campo] : v[campo] === 'on')

  const campo = (nombre: 'banco' | 'titular' | 'cuenta' | 'nota', rotulo: string, placeholder: string) => (
    <label className="flex flex-col gap-2" htmlFor={`${id}-${nombre}`}>
      <span className={LABEL_CLASS}>{rotulo}</span>
      <input
        autoComplete="off"
        className={FIELD_CLASS}
        defaultValue={valor(nombre)}
        id={`${id}-${nombre}`}
        maxLength={TOPES[nombre]}
        name={nombre}
        placeholder={placeholder}
      />
    </label>
  )

  return (
    <form action={accion} className="flex flex-col gap-2" encType="multipart/form-data" key={JSON.stringify(v) + String(formas.tieneQr)}>
      <input name="eventId" type="hidden" value={eventId} />
      <input name="eventSlug" type="hidden" value={eventSlug} />

      <SettingsSection description="El efectivo que tus invitados entregan en la fiesta, en su sobre. La invitación lo avisa con una frase." title="Lluvia de sobres">
        <SwitchRow defaultChecked={encendido('sobres')} description="Muestra la tarjeta de sobres en tu invitación." label="Pedir lluvia de sobres" name="sobres" />
        <label className="flex flex-col gap-2" htmlFor={`${id}-sobres-texto`}>
          <span className={LABEL_CLASS}>La frase (opcional)</span>
          <textarea
            className={`${FIELD_CLASS} min-h-[84px] resize-y`}
            defaultValue={valor('sobresTexto')}
            id={`${id}-sobres-texto`}
            maxLength={TOPES.sobresTexto}
            name="sobresTexto"
            placeholder={sobresPorDefecto}
          />
        </label>
      </SettingsSection>

      <SettingsSection
        description={
          <>
            Tus invitados te transfieren directo: el dinero no pasa por nosotros. Genera el QR en la app de tu banco (QR Simple) con <strong>monto libre</strong> y con
            vencimiento <strong>después de tu fiesta</strong>, y sube la imagen.
          </>
        }
        title="Transferencia o QR"
      >
        <SwitchRow defaultChecked={encendido('transferencia')} description="Muestra tus datos y tu QR en la invitación." label="Recibir por transferencia" name="transferencia" />
        <div className="grid gap-3 min-[560px]:grid-cols-2">
          {campo('banco', 'Banco', 'Banco Nacional de Bolivia')}
          {campo('titular', 'Titular', 'Ana Vega Rojas')}
          {campo('cuenta', 'Número de cuenta', '1000-2000-3000')}
          {campo('nota', 'Indicación (opcional)', 'Glosa: Boda Ana y Luis')}
        </div>

        <div className="mt-2 flex flex-col gap-3 rounded-[14px] border border-line-panel p-4">
          <span className={LABEL_CLASS}>QR de tu banco</span>
          {formas.tieneQr ? (
            <div className="flex items-center gap-4">
              {/* `no-store` en su ruta: al cambiarlo se ve el nuevo sin trucos de caché. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Tu QR para recibir transferencias"
                className={`size-24 rounded-[10px] border border-line-panel bg-white object-contain p-1 transition-opacity ${quitarQr ? 'opacity-30' : ''}`}
                src={`/panel/eventos/${eventSlug}/regalos/qr`}
              />
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-soft">
                <input checked={quitarQr} className="accent-ink" name="quitarQr" onChange={(e) => setQuitarQr(e.target.checked)} type="checkbox" value="1" />
                Quitar este QR
              </label>
            </div>
          ) : null}
          <label className="flex flex-col gap-2" htmlFor={`${id}-qr`}>
            <span className="text-[13px] text-ink-soft">{formas.tieneQr ? 'Subir otro QR' : 'Subir el QR'} · JPG, PNG o WEBP, hasta 2 MB</span>
            <input accept="image/png,image/jpeg,image/webp" className="text-[13px]" id={`${id}-qr`} name="qr" type="file" />
          </label>
        </div>
      </SettingsSection>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <SubmitButton pending={pendiente} pendingLabel="Guardando…">
          Guardar
        </SubmitButton>
        <ActionFeedback state={estado} />
      </div>
    </form>
  )
}
