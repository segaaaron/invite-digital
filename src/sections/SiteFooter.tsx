import { BRAND } from '@/shared/config/brand'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Locale } from '@/shared/i18n/locales'

export function SiteFooter({ dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const year = new Date().getUTCFullYear()

  return (
    <footer className="border-t border-[var(--color-line)] px-6 py-14 text-center">
      <p className="font-display text-[22px] tracking-[0.12em] text-ink">LUXE · {BRAND.siteName}</p>
      <p className="mt-3 text-[12px] text-ink-mute">{dictionary.footer.coverage}</p>
      <p className="mt-6 text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">
        © {year} {dictionary.footer.rights}
      </p>
    </footer>
  )
}
