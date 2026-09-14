import Link from 'next/link'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Locale } from '@/shared/i18n/locales'
import { Button } from '@/shared/design/ui/Button'

type Props = { locale: Locale; dictionary: Dictionary }

export function SiteHeader({ locale, dictionary }: Props) {
  // Las cinco entradas de la maqueta: dos a la izquierda del logotipo y dos a la derecha,
  // con el botón al final.
  //
  // Con la portada delante: la cabecera sale también en colecciones y en el pedido, y ahí
  // un `#precios` a secas no llevaba a ninguna parte.
  const inicio = `/${locale}`
  const izquierda = [
    { href: `${inicio}#colecciones`, label: dictionary.nav.collections },
    { href: `${inicio}#experiencia`, label: dictionary.nav.experience },
  ]
  const derecha = [
    { href: `${inicio}#diferencia`, label: dictionary.nav.cases },
    { href: `${inicio}#precios`, label: dictionary.nav.pricing },
  ]

  return (
    <header className="fixed inset-x-0 top-[18px] z-[70] flex justify-center px-4">
      <div className="flex w-full max-w-[1180px] items-center gap-8 rounded-[var(--radius-pill)] border border-[var(--color-line)] bg-bg-raised/72 px-6 py-3 shadow-[var(--shadow-float)] backdrop-blur-[18px]">
        <nav className="hidden flex-1 items-center justify-end gap-8 text-[11.5px] uppercase tracking-[var(--tracking-luxe)] md:flex">
          {izquierda.map((link) => (
            <a key={link.href} className="text-ink-soft transition-colors hover:text-gold-deep" href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <Link className="flex flex-col items-center px-2 leading-none" href={`/${locale}`}>
          <span className="bg-gradient-to-r from-gold-deep via-gold-light to-gold-deep bg-clip-text font-display text-[27px] font-medium tracking-[0.13em] text-transparent">
            LUXE
          </span>
          <span className="mt-1 text-[9px] uppercase tracking-[0.3em] text-ink-mute">InvitePremium</span>
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

        <Button href={`${inicio}#contacto`} className="ml-auto px-4! whitespace-nowrap md:hidden">
          {dictionary.nav.contact}
        </Button>
      </div>
    </header>
  )
}
