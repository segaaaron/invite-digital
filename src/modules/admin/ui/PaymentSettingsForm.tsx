'use client'

import { FilePicker } from '@/shared/design/ui/panel/FilePicker'
import { useActionState, useId } from 'react'
import { FIELD_CLASS, LABEL_CLASS, PanelAlert } from '@/shared/design/ui/panel/PanelKit'
import type { AdminActionState } from '@/app/_acciones/admin/admin-comun'
import { savePaymentSettingsAction, uploadPaymentQrAction } from '@/app/_acciones/admin/cobro-actions'
import type { PaymentSettings } from '../domain/payment-settings'
import { ActionFeedback, Ayuda, SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'

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
  const [datos, guardar, guardando] = useActionState<AdminActionState, FormData>(sinCaerse(savePaymentSettingsAction), INICIAL)
  const [imagen, subir, subiendo] = useActionState<AdminActionState, FormData>(sinCaerse(uploadPaymentQrAction), INICIAL)
  const id = useId()

  return (
    // La maqueta (E44): los datos de transferencia en su tarjeta y, al lado, el QR de cobro.
    <div className="flex flex-wrap items-start gap-9">
      <form action={guardar} aria-labelledby={`${id}-dc`} className="flex min-w-0 flex-[2_1_460px] flex-col gap-4.5 rounded-[16px] border border-line-panel bg-bg-raised p-7 max-[559px]:p-5">
        <div>
          <h2 className="font-display text-[24px] font-medium" id={`${id}-dc`}>
            Datos de transferencia
          </h2>
          {/* Los tres primeros o ninguno: media ficha de transferencia hace creer que se puede pagar. */}
          <p className="mt-1 text-[14px] text-ink-mute">Se muestran al cliente cuando hace su pedido. Banco, titular y cuenta van juntos.</p>
        </div>
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

        <SubmitButton className="w-fit self-end" variant="primary" pending={guardando} pendingLabel={'Guardando…'}>{'Guardar datos'}</SubmitButton>
      </form>

      <form action={subir} aria-labelledby={`${id}-qr`} className="flex min-w-0 flex-[1_1_260px] flex-col gap-3">
        <h2 className="font-display text-[24px] font-medium" id={`${id}-qr`}>
          QR de cobro
        </h2>

        <p className="text-[13.5px] text-ink-mute">En Bolivia el QR lo emite tu banco. Sube la imagen que exporta su aplicación.</p>
        <Ayuda titulo="¿Por qué no se genera aquí?">
          <p>
            En Bolivia el QR de cobro lo emite el sistema financiero, cifrado y firmado por el banco: no se puede generar
            fuera de él. Por eso se sube la imagen que exporta tu banco.
          </p>
        </Ayuda>

        <div className="grid aspect-square w-full max-w-[200px] place-items-center rounded-[16px] border border-line-panel bg-bg-raised p-4">
          {settings.hasQrImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="QR de cobro cargado" className="size-full object-contain" src="/qr-de-cobro" />
          ) : (
            <p className="text-center text-[13.5px] text-ink-mute">Todavía no hay ninguno: el pedido enseña solo los datos escritos.</p>
          )}
        </div>

        <FilePicker accept="image/png,image/jpeg,image/webp" hint="PNG, JPG o WEBP exportado de la app de tu banco" label="Elegir imagen del QR" name="qr" />

        <ActionFeedback errorsOnly state={imagen} />
        {imagen.status === 'success' && imagen.message !== undefined ? (
          <PanelAlert tone="ok">{imagen.message}</PanelAlert>
        ) : null}

        <SubmitButton className="w-fit" variant="default" pending={subiendo} pendingLabel={'Subiendo…'}>{settings.hasQrImage ? 'Cambiar imagen' : 'Subir QR'}</SubmitButton>
      </form>
    </div>
  )
}
