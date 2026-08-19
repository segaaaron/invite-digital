import { Reveal } from '@/shared/design/ui/Reveal'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import { MobilePhoneMockup } from './MobilePhoneMockup'

export function MobileSection({ dictionary }: { dictionary: Dictionary }) {
  const { mobile } = dictionary

  return (
    <section className="px-6 py-24" id="movil">
      <div className="mx-auto grid max-w-[1180px] items-center gap-14 lg:grid-cols-2">
        <Reveal className="flex flex-col gap-6">
          <span className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-gold-deep">{mobile.eyebrow}</span>
          <h2 className="font-display text-[clamp(32px,4.2vw,56px)] font-light leading-[1.04] text-ink">{mobile.title}</h2>
          <p className="max-w-[46ch] text-[16px] leading-[1.75] text-ink-soft">{mobile.body}</p>
          <ul className="flex flex-col gap-3.5 text-[14.5px] text-ink">
            {mobile.bullets.map((bullet) => (
              <li key={bullet} className="flex items-center gap-3">
                <svg
                  aria-hidden="true"
                  className="shrink-0 text-gold-deep"
                  fill="none"
                  height="16"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.4"
                  viewBox="0 0 24 24"
                  width="16"
                >
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                {bullet}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.1}>
          <MobilePhoneMockup />
        </Reveal>
      </div>
    </section>
  )
}
