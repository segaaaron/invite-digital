'use client'

import { QrCodeSvg } from '@/shared/design/ui/QrCodeSvg'
import { useT } from '@/shared/i18n/idioma-navegador'

/**
 * El mismo QR que ve el invitado en su enlace, con el rótulo del pase.
 *
 * El dibujo vive en `QrCodeSvg`, que lo comparte con la hoja de reparto.
 */
export function PassQrSvg({ url, label }: { url: string; label: string }) {
  const t = useT()
  return <QrCodeSvg label={t(`Pase de ${label}`, `${label}’s pass`)} url={url} />
}
