'use client'

import { QrDigital } from '@/shared/design/ui/QrDigital'
import { conCanal } from '../domain/invitation-url'
import { useT } from '@/shared/i18n/idioma-navegador'

export type DeliveryCard = { readonly label: string; readonly url: string }

/**
 * El enlace y el código QR de cada invitación recién creada, **en digital**: para descargar o
 * compartir. Sin hoja de reparto ni impresión (pedido por el usuario).
 */
export function DeliverySheet({ cards, eventTitle }: { cards: readonly DeliveryCard[]; eventTitle: string }) {
  const t = useT()
  if (cards.length === 0) return null
  return (
    <section aria-label={t(`Códigos QR · ${eventTitle}`, `QR codes · ${eventTitle}`)} className="flex flex-col gap-3">
      <p className="m-0 text-[12px] text-ink-soft">
        {cards.length === 1 ? t('Su código QR, listo para mandar como imagen.', 'Their QR code, ready to send as an image.') : t(`Los ${cards.length} códigos QR, listos para mandar como imagen.`, `The ${cards.length} QR codes, ready to send as images.`)}
      </p>
      <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
        {cards.map((card) => (
          <li className="flex flex-col gap-2 rounded-[14px] border border-line-panel bg-white p-3.5" key={card.url}>
            <span className="text-[13.5px] text-ink">{card.label}</span>
            <QrDigital nombre={card.label} url={conCanal(card.url, 'qr')} />
          </li>
        ))}
      </ul>
    </section>
  )
}
