import Link from 'next/link'
import { BRAND } from '@/shared/config/brand'

/**
 * **La firma de la casa en una demo** (20 oct): la invitación que el admin le manda a un posible cliente
 * va marcada, y la marca es a la vez el botón de venta.
 *
 * Va al final, pegada a «Hecho por Luxury Atelier», y no flotando encima: lo que el cliente viene a ver es
 * la invitación entera, y una cinta fija le taparía justo lo que se le quiere enseñar. Quien llega hasta
 * abajo ya la vio: ese es el momento de decirle que la suya puede ser así.
 *
 * Dice **cuánto dura** porque el enlace muere en 24 horas y que caduque sin avisar se lee como que algo se
 * rompió.
 */
export function CintaDeDemo({ textos, href }: { readonly textos: { readonly titulo: string; readonly aviso: string; readonly accion: string }; readonly href: string }) {
  return (
    <aside className="flex flex-col items-center gap-2 border-t border-gold/30 bg-ink px-5 py-5 text-center text-gold-light/90">
      <p className="font-mono text-[10px] tracking-[var(--tracking-luxe)] uppercase">{textos.titulo.replace('{marca}', BRAND.siteName)}</p>
      <p className="text-[12.5px] leading-[1.6] text-gold-light/70">{textos.aviso}</p>
      <Link
        className="mt-1 inline-flex min-h-11 items-center rounded-full border border-gold/50 px-5 font-mono text-[11px] tracking-[var(--tracking-luxe)] text-gold-light uppercase no-underline transition-colors hover:bg-gold/15"
        href={href}
      >
        {textos.accion}
      </Link>
    </aside>
  )
}
