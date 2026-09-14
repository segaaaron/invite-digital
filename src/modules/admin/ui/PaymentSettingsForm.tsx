'use client'

import { FilePicker } from '@/shared/design/ui/panel/FilePicker'
import { useActionState, useId } from 'react'
import { FIELD_CLASS, LABEL_CLASS, PanelAlert, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { savePaymentSettingsAction, uploadPaymentQrAction, type AdminActionState } from '../actions'
import type { PaymentSettings } from '../domain/payment-settings'

const INICIAL: AdminActionState = { status: 'idle' }

/**
 * Los datos que ve quien acaba de hacer un pedido.
 *
 * **El QR no se genera aquí y no puede generarse.** En Bolivia el QR de cobro lo emite el
 * sistema financiero: los códigos van cifrados y firmados por el banco. Lo único que hace
 * esta pantalla es guardar la imagen que el administrador exporta de su aplicación
 * bancaria. Decirlo en la propia pantalla evita que alguien la busque durante media hora.
 */
export function PaymentSettingsForm({ settings }: { settings: PaymentSettings }) {
  const [datos, guardar, guardando] = useActionState<AdminActionState, FormData>(savePaymentSettingsAction, INICIAL)
  const [imagen, subir, subiendo] = useActionState<AdminActionState, FormData>(uploadPaymentQrAction, INICIAL)
  const id = useId()

  return (
    <div className="flex flex-col gap-7">
      <form action={guardar} className="flex flex-col gap-4">
        <div className="grid gap-4 min-[560px]:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className={LABEL_CLASS} htmlFor={`${id}-banco`}>
              Banco
            </label>
            <input className={FIELD_CLASS} defaultValue={settings.bank} id={`${id}-banco`} name="bank" type="text" />
          </div>

          <div className="flex flex-col gap-2">
            <label className={LABEL_CLASS} htmlFor={`${id}-titular`}>
              Titular de la cuenta
            </label>
            <input
              className={FIELD_CLASS}
              defaultValue={settings.accountHolder}
              id={`${id}-titular`}
              name="accountHolder"
              type="text"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className={LABEL_CLASS} htmlFor={`${id}-cuenta`}>
            Número de cuenta
          </label>
          <input
            className={`${FIELD_CLASS} font-mono`}
            defaultValue={settings.accountNumber}
            id={`${id}-cuenta`}
            name="accountNumber"
            type="text"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={LABEL_CLASS} htmlFor={`${id}-notas`}>
            Nota para quien transfiere
          </label>
          <input
            className={FIELD_CLASS}
            defaultValue={settings.notes}
            id={`${id}-notas`}
            name="notes"
            placeholder="Avísanos por WhatsApp cuando transfieras"
            type="text"
          />
        </div>

        {/* Los tres primeros o ninguno: media ficha de transferencia hace creer que se
            puede pagar, y el cliente lo descubre cuando ya escribió. */}
        <p className="text-[11px] leading-[1.7] text-ink-mute">
          Banco, titular y cuenta van juntos: si falta alguno, la página del pedido no enseña la ficha y remite a
          WhatsApp.
        </p>

        {datos.status === 'error' ? (
          <p className="text-[13px] text-danger" role="alert">
            {datos.message}
          </p>
        ) : null}
        {datos.status === 'success' && datos.message !== undefined ? (
          <p className="text-[13px] text-sage" role="status">
            {datos.message}
          </p>
        ) : null}

        <PanelButton className="w-fit" disabled={guardando} type="submit" variant="primary">
          {guardando ? 'Guardando…' : 'Guardar datos'}
        </PanelButton>
      </form>

      <form action={subir} className="flex flex-col gap-3.5 border-t border-line-panel pt-6">
        <p className={LABEL_CLASS}>Imagen del QR de cobro</p>

        <p className="text-[12px] leading-[1.7] text-ink-soft">
          Este QR <strong className="font-normal text-ink">no se genera aquí y no puede generarse</strong>: en
          Bolivia lo emite el sistema financiero, cifrado y firmado por el banco. Expórtalo de la aplicación de tu
          banco y súbelo.
        </p>

        {settings.hasQrImage ? (
          <span className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="QR de cobro cargado" className="w-28 rounded-xl border border-line-panel" src="/qr-de-cobro" />
            <span className="text-[12px] text-ink-soft">Ya hay uno cargado. Sube otro para reemplazarlo.</span>
          </span>
        ) : (
          <p className="text-[13px] text-ink-mute">Todavía no hay ninguno: la página del pedido enseña solo los datos escritos.</p>
        )}

        <FilePicker accept="image/png,image/jpeg,image/webp" hint="PNG, JPG o WEBP exportado de la app de tu banco" label="Elegir imagen del QR" name="qr" />

        {imagen.status === 'error' ? <PanelAlert tone="error">{imagen.message}</PanelAlert> : null}
        {imagen.status === 'success' && imagen.message !== undefined ? (
          <PanelAlert tone="ok">{imagen.message}</PanelAlert>
        ) : null}

        <PanelButton className="w-fit" disabled={subiendo} type="submit">
          {subiendo ? 'Subiendo…' : 'Subir QR'}
        </PanelButton>
      </form>
    </div>
  )
}
