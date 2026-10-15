'use client'

import { FilePicker } from '@/shared/design/ui/panel/FilePicker'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useId, useState } from 'react'
import { guardarFormasDeRegalarAction, type FormasState } from '@/app/_acciones/registry/formas-actions'
import { SettingsSection, SwitchRow } from '@/shared/design/ui/panel/ajustes'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { FIELD_CLASS, LABEL_CLASS } from '@/shared/design/ui/panel/PanelKit'
import { TOPES, type FormasDeRegalar } from '../domain/formas-de-regalar'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { useT } from '@/shared/i18n/idioma-navegador'

const INICIAL: FormasState = { status: 'idle' }

/**
 * La lluvia de sobres o la transferencia con su QR, en el panel: **una por diálogo** (`seccion`), desde su
 * tarjeta. En todos los planes: es como más se regala en Bolivia. El dinero va directo a la cuenta del
 * cliente; nosotros no cobramos nada.
 *
 * La acción guarda las dos a la vez, así que lo de la otra sección viaja oculto con su valor de ahora:
 * guardar los sobres no apaga la transferencia. El QR sin fichero nuevo se conserva.
 */
export function FormasDeRegalarForm({
  eventId,
  eventSlug,
  formas,
  sobresPorDefecto,
  seccion,
  cerrarEn,
}: {
  eventId: string
  eventSlug: string
  formas: FormasDeRegalar
  /** La frase que ve el invitado si no se escribe otra. */
  sobresPorDefecto: string
  seccion: 'sobres' | 'transferencia'
  /** Adónde volver al guardar bien (cierra el diálogo). */
  cerrarEn: string
}) {
  const t = useT()
  const router = useRouter()
  const [estado, accion, pendiente] = useActionState(sinCaerse(guardarFormasDeRegalarAction), INICIAL)
  useEffect(() => {
    if (estado.status === 'success') router.replace(cerrarEn)
  }, [estado, router, cerrarEn])
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
      {seccion === 'sobres' ? (
        <>
          {formas.transferencia ? <input name="transferencia" type="hidden" value="on" /> : null}
          {(['banco', 'titular', 'cuenta', 'nota'] as const).map((c) => (
            <input key={c} name={c} type="hidden" value={formas[c] ?? ''} />
          ))}
        </>
      ) : (
        <>
          {formas.sobres ? <input name="sobres" type="hidden" value="on" /> : null}
          <input name="sobresTexto" type="hidden" value={formas.sobresTexto ?? ''} />
        </>
      )}

      {seccion !== 'sobres' ? null : (
      <SettingsSection description={t('El efectivo que tus invitados entregan en la fiesta, en su sobre. La invitación lo avisa con una frase.', 'The cash your guests bring to the party in an envelope. The invitation mentions it with a sentence.')} title={t('Lluvia de sobres', 'Envelope gifts')}>
        <SwitchRow defaultChecked={encendido('sobres')} description={t('Muestra la tarjeta de sobres en tu invitación.', 'Shows the envelope card in your invitation.')} label={t('Pedir lluvia de sobres', 'Ask for envelope gifts')} name="sobres" />
        <label className="flex flex-col gap-2" htmlFor={`${id}-sobres-texto`}>
          <span className={LABEL_CLASS}>{t('La frase (opcional)', 'The sentence (optional)')}</span>
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
      )}

      {seccion !== 'transferencia' ? null : (
      <SettingsSection
        description={
          <>
            {t('Tus invitados te transfieren directo: el dinero no pasa por nosotros. Genera el QR en la app de tu banco (QR Simple) con ', 'Your guests transfer to you directly: the money never goes through us. Create the QR in your bank app (QR Simple) with ')}
            <strong>{t('monto libre', 'an open amount')}</strong>
            {t(' y con vencimiento ', ' and an expiry ')}
            <strong>{t('después de tu fiesta', 'after your party')}</strong>
            {t(', y sube la imagen.', ', then upload the image.')}
          </>
        }
        title={t('Transferencia o QR', 'Transfer or QR')}
      >
        <SwitchRow defaultChecked={encendido('transferencia')} description={t('Muestra tus datos y tu QR en la invitación.', 'Shows your details and QR in the invitation.')} label={t('Recibir por transferencia', 'Receive by transfer')} name="transferencia" />
        <div className="grid gap-3 min-[560px]:grid-cols-2">
          {campo('banco', t('Banco', 'Bank'), 'Banco Nacional de Bolivia')}
          {campo('titular', t('Titular', 'Account holder'), 'Ana Vega Rojas')}
          {campo('cuenta', t('Número de cuenta', 'Account number'), '1000-2000-3000')}
          {campo('nota', t('Indicación (opcional)', 'Reference (optional)'), t('Glosa: Boda Ana y Luis', 'Reference: Ana & Luis wedding'))}
        </div>

        <div className="mt-2 flex flex-col gap-3 rounded-[14px] border border-line-panel p-4">
          <span className={LABEL_CLASS}>{t('QR de tu banco', 'Your bank QR')}</span>
          {formas.tieneQr ? (
            <div className="flex items-center gap-4">
              {/* `no-store` en su ruta: al cambiarlo se ve el nuevo sin trucos de caché. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={t('Tu QR para recibir transferencias', 'Your QR to receive transfers')}
                className={`size-24 rounded-[10px] border border-line-panel bg-white object-contain p-1 transition-opacity ${quitarQr ? 'opacity-30' : ''}`}
                src={`/panel/eventos/${eventSlug}/regalos/qr`}
              />
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-soft">
                <input checked={quitarQr} className="accent-ink" name="quitarQr" onChange={(e) => setQuitarQr(e.target.checked)} type="checkbox" value="1" />
                {t('Quitar este QR', 'Remove this QR')}
              </label>
            </div>
          ) : null}
          {/* `FilePicker` y no el selector nativo: el nativo dice «Choose File · No file chosen» en el idioma
              del navegador, en inglés en muchos celulares. */}
          <FilePicker accept="image/png,image/jpeg,image/webp" hint={t('JPG, PNG o WEBP, hasta 2 MB', 'JPG, PNG or WEBP, up to 2 MB')} label={formas.tieneQr ? t('Subir otro QR', 'Upload another QR') : t('Subir el QR', 'Upload the QR')} name="qr" />
        </div>
      </SettingsSection>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <SubmitButton pending={pendiente} pendingLabel={t('Guardando…', 'Saving…')}>
          {t('Guardar', 'Save')}
        </SubmitButton>
        <ActionFeedback state={estado} />
      </div>
    </form>
  )
}
