'use client'

import { QrDigital } from '@/shared/design/ui/QrDigital'

export type DeliveryCard = { readonly label: string; readonly url: string }

/**
 * El enlace y el código QR de cada invitación recién creada, **en digital**: para descargar o
 * compartir. Sin hoja de reparto ni impresión (pedido por el usuario).
 */
export function DeliverySheet({ cards, eventTitle }: { cards: readonly DeliveryCard[]; eventTitle: string }) {
  if (cards.length === 0) return null
  return (
    <section aria-label={`Códigos QR · ${eventTitle}`} className="flex flex-col gap-3">
      <p className="m-0 text-[12px] text-ink-soft">
        {cards.length === 1 ? 'Su código QR, listo para mandar como imagen.' : `Los ${cards.length} códigos QR, listos para mandar como imagen.`}
      </p>
      <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
        {cards.map((card) => (
          <li className="flex flex-col gap-2 rounded-[14px] border border-line-panel bg-white p-3.5" key={card.url}>
            <span className="text-[13.5px] text-ink">{card.label}</span>
            <QrDigital nombre={card.label} url={card.url} />
          </li>
        ))}
      </ul>
    </section>
  )
}
