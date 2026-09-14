import { BRAND } from '@/shared/config/brand'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Locale } from '@/shared/i18n/locales'

export function SiteFooter({ dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const year = new Date().getUTCFullYear()

  return (
    // Una sola línea de tres bloques, como la maqueta: marca a la izquierda, cobertura en
    // medio y derechos a la derecha. El pie centrado en tres alturas que había antes
    // pesaba más que la sección de contacto que lo precede.
    <footer className="border-t border-[var(--color-line)] px-6 py-9">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-5 text-center">
        <span className="font-display text-[19px] tracking-[0.12em] text-gold-deep">{BRAND.siteName}</span>
        <span className="text-[10.5px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
          {dictionary.footer.coverage}
        </span>
        <span className="text-[10.5px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
          © {year} {dictionary.footer.rights}
        </span>
      </div>
    </footer>
  )
}
