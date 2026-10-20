import Link from 'next/link'
import Image from 'next/image'

/**
 * La demo de un día, abierta tarde (0099).
 *
 * **No es un 404 y no debe parecerlo.** El enlace fue bueno, quien lo abre es un posible cliente, y lo que
 * tiene que leer es que las demostraciones duran un día —no que algo se rompió— con una salida a los
 * precios, que es a donde iba todo esto.
 */
export function DemoCaducada({ textos, href }: { readonly textos: { readonly titulo: string; readonly texto: string; readonly accion: string }; readonly href: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-ink px-6 py-16 text-center text-gold-light/90">
      <Image alt="" aria-hidden height={44} src="/site/marca/sello-la-48-627a79b8.avif" unoptimized width={44} />
      <h1 className="font-display text-[26px] leading-tight font-medium text-gold-light">{textos.titulo}</h1>
      <p className="max-w-[46ch] text-[14.5px] leading-[1.7] text-gold-light/70">{textos.texto}</p>
      <Link
        className="mt-1 inline-flex min-h-11 items-center rounded-full border border-gold/50 px-6 font-mono text-[11px] tracking-[var(--tracking-luxe)] text-gold-light uppercase no-underline transition-colors hover:bg-gold/15"
        href={href}
      >
        {textos.accion}
      </Link>
    </main>
  )
}
