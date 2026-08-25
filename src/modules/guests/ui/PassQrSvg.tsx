'use client'

import { QrCodeSvg } from '@/shared/design/ui/QrCodeSvg'

/**
 * El mismo QR que ve el invitado en su enlace, con el rótulo del pase.
 *
 * El dibujo vive en `QrCodeSvg`, que lo comparte con la hoja de reparto.
 */
export function PassQrSvg({ url, label }: { url: string; label: string }) {
  return <QrCodeSvg label={`Pase de ${label}`} url={url} />
}
