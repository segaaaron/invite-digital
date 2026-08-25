'use client'

import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { printMarkedOnly } from '@/shared/design/ui/print'
import { QrCodeSvg } from '@/shared/design/ui/QrCodeSvg'

export type DeliveryCard = {
  readonly label: string
  readonly url: string
}

/**
 * La hoja de reparto: una tarjeta por grupo, con su QR y su dirección, lista para
 * imprimir, recortar y entregar en mano.
 *
 * **Solo puede existir aquí, en el navegador y en este momento.** De cada enlace la base
 * guarda únicamente su SHA-256, así que no hay ninguna página del servidor capaz de
 * dibujar estos códigos: el token en claro vive lo que dure esta pantalla. Por eso la
 * hoja aparece pegada al alta, al reenvío y a la importación, y no en una ruta aparte
 * como el plan del banquete.
 *
 * Se imprime marcando el `body`, no abriendo otra pestaña: el enlace es el secreto del
 * invitado y una pestaña nueva lo dejaría escrito en la barra de direcciones, en el
 * historial y en el `Referer` de todo lo que esa página pidiera.
 */
export function DeliverySheet({ cards, eventTitle }: { cards: readonly DeliveryCard[]; eventTitle: string }) {
  if (cards.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <p className="text-[12px] text-ink-soft">
          {cards.length === 1
            ? 'Una tarjeta para entregar en mano. El código lleva el mismo enlace.'
            : `${cards.length} tarjetas para recortar y entregar en mano.`}
        </p>
        <PanelButton className="print:hidden" onClick={printMarkedOnly}>
          Imprimir hoja de reparto
        </PanelButton>
      </div>

      <section
        className="rounded-2xl border border-line-panel bg-white p-4 print:border-0 print:p-0"
        data-para-imprimir
      >
        <h3 className="mb-3 font-display text-[18px] font-light text-ink">{eventTitle}</h3>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
          {cards.map((card) => (
            <li
              key={card.url}
              className="flex break-inside-avoid flex-col items-center gap-2 rounded-xl border border-line-panel p-3.5 text-center"
            >
              <span className="text-[14px] text-ink">{card.label}</span>
              <QrCodeSvg className="w-32" label={`Invitación de ${card.label}`} url={card.url} />
              <span className="font-mono text-[9px] break-all text-ink-mute">{card.url}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
