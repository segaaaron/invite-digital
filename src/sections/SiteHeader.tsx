import Link from 'next/link'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Locale } from '@/shared/i18n/locales'
import { Button } from '@/shared/design/ui/Button'
import { MenuMovil } from './MenuMovil'

type Props = { locale: Locale; dictionary: Dictionary }

export function SiteHeader({ locale, dictionary }: Props) {
  // Las cinco entradas de la maqueta: dos a la izquierda del logotipo y dos a la derecha,
  // con el botón al final.
  //
  // Con la portada delante: la cabecera sale también en colecciones y en el pedido, y ahí
  // un `#precios` a secas no llevaba a ninguna parte.
  const inicio = `/${locale}`
  // Las dos fiestas van primero: son dos productos, cada uno con su página.
  const izquierda = [
    { href: `${inicio}/bodas`, label: dictionary.nav.weddings },
    { href: `${inicio}/xv-anos`, label: dictionary.nav.quinceaneras },
  ]
  const derecha = [
    { href: `${inicio}/colecciones`, label: dictionary.nav.collections },
    { href: `${inicio}#precios`, label: dictionary.nav.pricing },
  ]

  return (
    <header className="fixed inset-x-0 top-[18px] z-[70] flex justify-center px-4">
      <div className="relative flex w-full max-w-[1180px] items-center gap-3 rounded-[var(--radius-pill)] border border-[var(--color-line)] bg-bg-raised/72 px-4 py-3 md:gap-8 md:px-6 shadow-[var(--shadow-float)] backdrop-blur-[18px]">
        <nav className="hidden flex-1 items-center justify-end gap-8 text-[11.5px] uppercase tracking-[var(--tracking-luxe)] md:flex">
          {izquierda.map((link) => (
            <a key={link.href} className="text-ink-soft transition-colors hover:text-gold-deep" href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        {/* El logotipo horizontal de la marca: el sello de lacre «LA» y el nombre en una línea. */}
        <Link aria-label="Luxury Atelier" className="flex items-center gap-2.5 px-1 leading-none" href={`/${locale}`}>
          {/* El sello de lacre real de la marca (documento de marca, 875 px), con el grabado realzado para que
              las iniciales se lean a este tamaño. Sale de la fuente grande en 1x, 2x y 3x: la copia de 192 px
              que había antes, reducida, dejaba la caligrafía borrosa. Un vectorial se leía, pero era de juguete. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            className="size-12 shrink-0 object-contain drop-shadow-[0_2px_5px_rgb(104_80_36/0.28)]"
            height={47}
            src="/site/marca/sello-la-48-f98d8d2a.avif"
            srcSet="/site/marca/sello-la-48-f98d8d2a.avif 1x, /site/marca/sello-la-96-1f9874bd.avif 2x, /site/marca/sello-la-144-249452d9.avif 3x"
            width={48}
          />
          <span className="bg-gradient-to-r from-gold-deep via-gold-light to-gold-deep bg-clip-text font-display text-[19px] font-medium tracking-[0.16em] whitespace-nowrap text-transparent min-[440px]:text-[21px]">
            LUXURY ATELIER
          </span>
        </Link>

        <nav className="hidden flex-1 items-center gap-8 text-[11.5px] uppercase tracking-[var(--tracking-luxe)] md:flex">
          {derecha.map((link) => (
            <a key={link.href} className="text-ink-soft transition-colors hover:text-gold-deep" href={link.href}>
              {link.label}
            </a>
          ))}
          <Button href={`${inicio}#contacto`} className="ml-auto whitespace-nowrap">
            {dictionary.nav.contact}
          </Button>
        </nav>

        {/* En pantallas estrechas no caben logotipo, botón y menú: el botón pasa al menú. */}
        <Button href={`${inicio}#contacto`} className="ml-auto px-4! whitespace-nowrap max-[439px]:hidden! md:hidden!">
          {dictionary.nav.contact}
        </Button>
        <div className="ml-auto min-[440px]:ml-0 md:hidden">
          <MenuMovil
            abrir={dictionary.nav.menu}
            accion={{ href: `${inicio}#contacto`, label: dictionary.nav.contact }}
            cerrar={dictionary.nav.closeMenu}
            enlaces={[...izquierda, ...derecha]}
          />
        </div>
      </div>
    </header>
  )
}
