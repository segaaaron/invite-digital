'use client'

import QRCode from 'qrcode'
import { useState } from 'react'
import { QrCodeSvg } from './QrCodeSvg'
import { useT } from '@/shared/i18n/idioma-navegador'

/** El QR como imagen PNG, para guardarlo o mandarlo por el chat que se quiera. */
async function imagenDelQr(url: string): Promise<string> {
  return QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 2, width: 900 })
}

const archivo = (nombre: string) => `${nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'invitacion'}-qr.png`

const BOTON = 'cursor-pointer rounded-full border border-line-panel-strong bg-white px-3.5 py-1.5 text-[12px] text-ink transition hover:border-ink'

/**
 * El código QR de una invitación, **digital**: se descarga como imagen o se comparte desde el
 * celular. Nada de hojas para imprimir ni tarjetas en mano (pedido por el usuario).
 */
/** Guarda el QR como imagen PNG. */
export async function descargarQr(url: string, nombre: string): Promise<void> {
  const enlace = document.createElement('a')
  enlace.href = await imagenDelQr(url)
  enlace.download = archivo(nombre)
  enlace.click()
}

/** Lo comparte como imagen desde el celular; donde no se puede, lo descarga. Lanza si falla. */
export async function compartirQr(url: string, nombre: string): Promise<void> {
  const blob = await (await fetch(await imagenDelQr(url))).blob()
  const file = new File([blob], archivo(nombre), { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: nombre })
  else await descargarQr(url, nombre)
}

export function QrDigital({ url, nombre, className = 'w-28' }: { url: string; nombre: string; className?: string }) {
  const t = useT()
  const [aviso, setAviso] = useState<string | null>(null)
  const descargar = () => descargarQr(url, nombre)
  const compartir = () => compartirQr(url, nombre).catch(() => setAviso(t('No se pudo compartir. Descárgalo y envíalo como imagen.', 'It couldn’t be shared. Download it and send it as an image.')))

  return (
    <div className="flex items-center gap-4">
      <QrCodeSvg className={`${className} shrink-0 border border-line-panel p-1`} label={t(`Código QR de ${nombre}`, `QR code for ${nombre}`)} url={url} />
      <div className="flex flex-col items-start gap-2">
        <p className="m-0 text-[12px] leading-[1.5] text-ink-soft">{t('Abre la misma invitación. Mándalo como imagen o úsalo en tu diseño.', 'Opens the same invitation. Send it as an image or use it in your design.')}</p>
        <div className="flex flex-wrap gap-2">
          <button className={BOTON} onClick={() => void descargar()} type="button">
            {t('Descargar QR', 'Download QR')}
          </button>
          <button className={BOTON} onClick={() => void compartir()} type="button">
            {t('Compartir QR', 'Share QR')}
          </button>
        </div>
        {aviso === null ? null : (
          <p className="m-0 text-[12px] text-danger" role="alert">
            {aviso}
          </p>
        )}
      </div>
    </div>
  )
}
