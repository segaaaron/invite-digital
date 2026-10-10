import Image from 'next/image'
import { BRAND } from '@/shared/config/brand'

/**
 * El pie de cada invitación (documento de cambios, sección 1): el monograma LA y «Hecho por Luxury
 * Atelier», que lleva a la web. Discreto, en la tinta de la marca, al final de todo.
 */
export function HechoPorLuxury({ texto, href }: { readonly texto: string; readonly href: string }) {
  return (
    <a
      className="flex items-center justify-center gap-2 bg-ink px-4 py-4 font-mono text-[9px] tracking-[var(--tracking-luxe)] text-gold-light/90 uppercase no-underline"
      href={href}
      rel="noopener"
      target="_blank"
    >
      {/* El favicon de la marca: el sello de lacre «LA». */}
      <Image alt="" aria-hidden height={18} src="/site/marca/sello-la-48-627a79b8.avif" unoptimized width={18} />
      {texto.replace('{marca}', BRAND.siteName)}
    </a>
  )
}
