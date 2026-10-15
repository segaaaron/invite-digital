'use client'

import { useState } from 'react'
import { crearLlaveDeSiriAction, type LlaveDeSiriState } from '@/app/_acciones/asistente/siri-actions'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { useIdioma, useT } from '@/shared/i18n/idioma-navegador'

/**
 * **«Oye Siri, Luxury»** (Mi cuenta): la llave, y cómo poner el Atajo de Apple que la usa. Con el atajo
 * compartido por el atelier (Admin › Asistente) es un toque; sin él, los pasos para armarlo en la app Atajos.
 */
export function LuxuryConSiri({ atajo, url }: { atajo: string; url: string }) {
  const t = useT()
  const locale = useIdioma()
  const [estado, setEstado] = useState<LlaveDeSiriState>({ status: 'idle' })
  const [creando, setCreando] = useState(false)
  const [copiada, setCopiada] = useState(false)
  const crear = async () => {
    setCreando(true)
    setCopiada(false)
    try {
      setEstado(await crearLlaveDeSiriAction())
    } catch {
      setEstado({ status: 'error', message: t('Se cortó la conexión. Vuelve a intentarlo.', 'The connection dropped. Try again.') })
    } finally {
      setCreando(false)
    }
  }
  const copiar = async (llave: string) => {
    try {
      await navigator.clipboard.writeText(llave)
      setCopiada(true)
    } catch {
      setCopiada(false)
    }
  }

  return (
    <div className="flex max-w-[560px] flex-col gap-4 text-[13.5px] leading-relaxed text-ink-soft">
      {locale === 'es' ? (
      <ol className="flex list-decimal flex-col gap-2 pl-5">
          <li>
            Crea tu llave y cópiala. Es como tu contraseña: no la compartas.
          </li>
          {atajo === '' ? (
            <li>
              En tu iPhone, toca <strong>{t('Descargar el atajo', 'Download the shortcut')}</strong>, ábrelo desde Descargas (app Archivos) y, cuando la app Atajos te la pida, pega
              tu llave. Si lo tienes en una Mac con tu misma cuenta de iCloud, ábrelo ahí: llega solo a tu iPhone.
            </li>
          ) : (
            <li>
              Toca <strong>{t('Añadir a Siri', 'Add to Siri')}</strong> en tu iPhone y, cuando te la pida, pega tu llave.
            </li>
          )}
          <li>
            Di <strong>«Oye Siri, Luxury»</strong> y háblale: te responde en voz alta, también con el teléfono bloqueado.
          </li>
        </ol>
      ) : (
      <ol className="flex list-decimal flex-col gap-2 pl-5">
          <li>Create your key and copy it. It is like your password: do not share it.</li>
          {atajo === '' ? (
            <li>
              On your iPhone, tap <strong>Download the shortcut</strong>, open it from Downloads (Files app) and, when the Shortcuts app asks, paste your
              key. If you have it on a Mac with the same iCloud account, open it there: it reaches your iPhone on its own.
            </li>
          ) : (
            <li>
              Tap <strong>Add to Siri</strong> on your iPhone and, when asked, paste your key.
            </li>
          )}
          <li>
            Say <strong>“Hey Siri, Luxury”</strong> and talk to it: it answers out loud, even with the phone locked.
          </li>
        </ol>
      )}
      <div className="flex flex-wrap items-center gap-2.5">
        <PanelButton aria-busy={creando || undefined} disabled={creando} onClick={() => void crear()} variant={estado.status === 'success' ? 'default' : 'primary'}>
          {estado.status === 'success' ? t('Crear otra llave', 'Create another key') : t('Crear mi llave', 'Create my key')}
        </PanelButton>
        {atajo === '' ? (
          // El atajo firmado (`scripts/atajo-de-siri.py`): sin el enlace de iCloud, se baja y se abre en Atajos.
          <a className="inline-flex min-h-11 items-center rounded-full border border-line-panel-strong bg-white px-4 text-[13px] text-ink hover:border-ink" download href="/siri/Luxury.shortcut">
            {t('Descargar el atajo', 'Download the shortcut')}
          </a>
        ) : (
          <PanelButton external href={atajo}>
            {t('Añadir a Siri', 'Add to Siri')}
          </PanelButton>
        )}
      </div>
      {estado.status === 'success' ? (
        <div className="flex flex-col gap-2">
          <input aria-label={t('Tu llave de Siri', 'Your Siri key')} className="w-full rounded-[14px] border border-line-panel-strong bg-white px-4 py-3 font-codigo text-[13px] text-ink" onFocus={(e) => e.currentTarget.select()} readOnly value={estado.llave} />
          <div className="flex flex-wrap items-center gap-3">
            <PanelButton onClick={() => void copiar(estado.llave)}>{t('Copiar la llave', 'Copy the key')}</PanelButton>
            <span aria-live="polite" className="text-[12.5px] text-ink-mute" role="status">
              {copiada ? t('Copiada.', 'Copied.') : t('Solo se enseña ahora. Si la pierdes, crea otra: la anterior deja de valer.', 'It is shown only now. If you lose it, create another: the previous one stops working.')}
            </span>
          </div>
        </div>
      ) : estado.status === 'error' ? (
        <p className="text-[12.5px] text-danger" role="alert">
          {estado.message}
        </p>
      ) : null}
      <details className="text-[12.5px]">
        <summary className="cursor-pointer text-ink">{t('Armarlo a mano en la app Atajos', 'Build it by hand in the Shortcuts app')}</summary>
        {locale === 'es' ? (
        <p className="mt-2">
            Toca <strong>+</strong> y llámalo «Luxury». Añade: <strong>Dictar texto</strong>; <strong>Obtener contenido de URL</strong> con método POST a{' '}
            <code className="font-codigo break-all">{url}</code>, encabezado <code className="font-codigo">Authorization</code> = <code className="font-codigo">Bearer</code> + espacio +
            tu llave, y cuerpo JSON con <code className="font-codigo">texto</code> = Texto dictado; y <strong>Leer texto</strong> con el Contenido de URL.
          </p>
        ) : (
        <p className="mt-2">
            Tap <strong>+</strong> and name it “Luxury”. Add: <strong>Dictate Text</strong>; <strong>Get Contents of URL</strong> with method POST to{' '}
            <code className="font-codigo break-all">{url}</code>, header <code className="font-codigo">Authorization</code> = <code className="font-codigo">Bearer</code> + space +
            your key, and JSON body with <code className="font-codigo">texto</code> = Dictated Text; and <strong>Speak Text</strong> with the Contents of URL.
          </p>
        )}
      </details>
      <p className="text-[12px] text-ink-mute">
        {t('La llave aparece en «Sesiones abiertas» como «Atajo de Siri»: si la cierras, Siri deja de entrar. Si pasas 30 días sin usarla, crea otra.', 'The key appears in “Open sessions” as “Siri shortcut”: if you close it, Siri can no longer get in. If you go 30 days without using it, create another.')}
      </p>
    </div>
  )
}
