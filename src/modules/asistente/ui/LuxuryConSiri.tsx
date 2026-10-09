'use client'

import { useState } from 'react'
import { crearLlaveDeSiriAction, type LlaveDeSiriState } from '@/app/_acciones/asistente/siri-actions'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'

/**
 * **«Oye Siri, Luxury»** (Mi cuenta): la llave, y cómo poner el Atajo de Apple que la usa. Con el atajo
 * compartido por el atelier (Admin › Asistente) es un toque; sin él, los pasos para armarlo en la app Atajos.
 */
export function LuxuryConSiri({ atajo, url }: { atajo: string; url: string }) {
  const [estado, setEstado] = useState<LlaveDeSiriState>({ status: 'idle' })
  const [creando, setCreando] = useState(false)
  const [copiada, setCopiada] = useState(false)
  const crear = async () => {
    setCreando(true)
    setCopiada(false)
    try {
      setEstado(await crearLlaveDeSiriAction())
    } catch {
      setEstado({ status: 'error', message: 'Se cortó la conexión. Vuelve a intentarlo.' })
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
      <ol className="flex list-decimal flex-col gap-2 pl-5">
        <li>
          Crea tu llave y cópiala. Es como tu contraseña: no la compartas.
        </li>
        {atajo === '' ? (
          <li>
            En tu iPhone abre la app <strong>Atajos</strong>, toca <strong>+</strong> y llámalo «Luxury». Añade tres acciones: <strong>Dictar texto</strong>;{' '}
            <strong>Obtener contenido de URL</strong> con método POST a <code className="font-codigo break-all">{url}</code>, encabezado{' '}
            <code className="font-codigo">Authorization</code> = <code className="font-codigo">Bearer</code> + espacio + tu llave, y cuerpo JSON con{' '}
            <code className="font-codigo">texto</code> = Texto dictado; y <strong>Leer texto</strong>.
          </li>
        ) : (
          <li>
            Toca <strong>Añadir a Siri</strong> en tu iPhone y, cuando te la pida, pega tu llave.
          </li>
        )}
        <li>
          Di <strong>«Oye Siri, Luxury»</strong> y háblale: te responde en voz alta, también con el teléfono bloqueado.
        </li>
      </ol>
      <div className="flex flex-wrap items-center gap-2.5">
        <PanelButton aria-busy={creando || undefined} disabled={creando} onClick={() => void crear()} variant={estado.status === 'success' ? 'default' : 'primary'}>
          {estado.status === 'success' ? 'Crear otra llave' : 'Crear mi llave'}
        </PanelButton>
        {atajo === '' ? null : (
          <PanelButton external href={atajo}>
            Añadir a Siri
          </PanelButton>
        )}
      </div>
      {estado.status === 'success' ? (
        <div className="flex flex-col gap-2">
          <input aria-label="Tu llave de Siri" className="w-full rounded-[14px] border border-line-panel-strong bg-white px-4 py-3 font-codigo text-[13px] text-ink" onFocus={(e) => e.currentTarget.select()} readOnly value={estado.llave} />
          <div className="flex flex-wrap items-center gap-3">
            <PanelButton onClick={() => void copiar(estado.llave)}>Copiar la llave</PanelButton>
            <span aria-live="polite" className="text-[12.5px] text-ink-mute" role="status">
              {copiada ? 'Copiada.' : 'Solo se enseña ahora. Si la pierdes, crea otra: la anterior deja de valer.'}
            </span>
          </div>
        </div>
      ) : estado.status === 'error' ? (
        <p className="text-[12.5px] text-danger" role="alert">
          {estado.message}
        </p>
      ) : null}
      <p className="text-[12px] text-ink-mute">
        La llave aparece en «Sesiones abiertas» como «Atajo de Siri»: si la cierras, Siri deja de entrar. Si pasas 30 días sin usarla, crea otra.
      </p>
    </div>
  )
}
