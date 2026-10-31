'use client'

import { FilePicker } from '@/shared/design/ui/panel/FilePicker'
import { useActionState, useId } from 'react'
import { FIELD_CLASS, LABEL_CLASS, PanelAlert } from '@/shared/design/ui/panel/PanelKit'
import type { AdminActionState } from '@/app/_acciones/admin/admin-comun'
import { savePaymentSettingsAction, uploadPaymentQrAction } from '@/app/_acciones/admin/cobro-actions'
import type { PaymentSettings } from '../domain/payment-settings'
import { ActionFeedback, Ayuda, SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { useT } from '@/shared/i18n/idioma-navegador'

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
  const t = useT()
  const [datos, guardar, guardando] = useActionState<AdminActionState, FormData>(sinCaerse(savePaymentSettingsAction), INICIAL)
  const [imagen, subir, subiendo] = useActionState<AdminActionState, FormData>(sinCaerse(uploadPaymentQrAction), INICIAL)
  const id = useId()

  return (
    // La maqueta (E44): los datos de transferencia en su tarjeta y, al lado, el QR de cobro.
    <div className="flex flex-wrap items-start gap-9">
      <form action={guardar} aria-labelledby={`${id}-dc`} className="flex min-w-0 flex-[2_1_460px] flex-col gap-4.5 rounded-[16px] border border-line-panel bg-bg-raised p-7 max-[559px]:p-5">
        <div>
          <h2 className="font-display text-[24px] font-medium" id={`${id}-dc`}>
            {t('Datos de transferencia', 'Transfer details')}
          </h2>
          {/* Los tres primeros o ninguno: media ficha de transferencia hace creer que se puede pagar. */}
          <p className="mt-1 text-[14px] text-ink-mute">{t('Se muestran al cliente cuando hace su pedido. Banco, titular y cuenta van juntos.', 'Shown to the client when they place their order. Bank, holder and account go together.')}</p>
        </div>
        <div className="grid gap-4 min-[560px]:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className={LABEL_CLASS} htmlFor={`${id}-banco`}>
              {t('Banco', 'Bank')}
            </label>
            <input className={FIELD_CLASS} defaultValue={settings.bank} id={`${id}-banco`} name="bank" type="text" />
          </div>

          <div className="flex flex-col gap-2">
            <label className={LABEL_CLASS} htmlFor={`${id}-titular`}>
              {t('Titular de la cuenta', 'Account holder')}
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
            {t('Número de cuenta', 'Account number')}
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
            {t('Nota para quien transfiere', 'Note for whoever transfers')}
          </label>
          <input
            className={FIELD_CLASS}
            defaultValue={settings.notes}
            id={`${id}-notas`}
            name="notes"
            placeholder={t('Avísanos por WhatsApp cuando transfieras', 'Let us know on WhatsApp when you transfer')}
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

        <SubmitButton className="w-fit self-end" variant="primary" pending={guardando} pendingLabel={t('Guardando…', 'Saving…')}>{t('Guardar datos', 'Save details')}</SubmitButton>
      </form>

      {/* En su tarjeta, como los datos de transferencia: suelto sobre el papel, al lado de una tarjeta,
          parecía que la pantalla se había quedado a medio hacer (30 oct). */}
      <form action={subir} aria-labelledby={`${id}-qr`} className="flex min-w-0 flex-[1_1_260px] flex-col gap-3 rounded-[16px] border border-line-panel bg-bg-raised p-7 max-[559px]:p-5">
        <h2 className="font-display text-[24px] font-medium" id={`${id}-qr`}>
          {t('QR de cobro', 'Payment QR')}
        </h2>

        <p className="text-[13.5px] text-ink-mute">{t('En Bolivia el QR lo emite tu banco. Sube la imagen que exporta su aplicación.', 'In Bolivia the QR is issued by your bank. Upload the image its app exports.')}</p>
        <Ayuda titulo={t('¿Por qué no se genera aquí?', 'Why is it not generated here?')}>
          <p>
            {t(
              'En Bolivia el QR de cobro lo emite el sistema financiero, cifrado y firmado por el banco: no se puede generar fuera de él. Por eso se sube la imagen que exporta tu banco.',
              'In Bolivia the payment QR is issued by the financial system, encrypted and signed by the bank: it cannot be generated outside it. That is why you upload the image your bank exports.',
            )}
          </p>
        </Ayuda>

        {/* El hueco, más hundido que la tarjeta que lo rodea: con el mismo papel se perdía el borde. */}
        <div className="grid aspect-square w-full max-w-[200px] place-items-center rounded-[16px] border border-line-panel bg-bg p-4">
          {settings.hasQrImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={t('QR de cobro cargado', 'Uploaded payment QR')} className="size-full object-contain" src="/qr-de-cobro" />
          ) : (
            <p className="text-center text-[13.5px] text-ink-mute">{t('Todavía no hay ninguno: el pedido enseña solo los datos escritos.', 'None yet: the order shows only the written details.')}</p>
          )}
        </div>

        <FilePicker accept="image/png,image/jpeg,image/webp" hint={t('PNG, JPG o WEBP exportado de la app de tu banco', 'PNG, JPG or WEBP exported from your bank app')} label={t('Elegir imagen del QR', 'Choose the QR image')} name="qr" />

        <ActionFeedback errorsOnly state={imagen} />
        {imagen.status === 'success' && imagen.message !== undefined ? (
          <PanelAlert tone="ok">{imagen.message}</PanelAlert>
        ) : null}

        <SubmitButton className="w-fit" variant="default" pending={subiendo} pendingLabel={t('Subiendo…', 'Uploading…')}>{settings.hasQrImage ? t('Cambiar imagen', 'Change image') : t('Subir QR', 'Upload QR')}</SubmitButton>
      </form>
    </div>
  )
}
