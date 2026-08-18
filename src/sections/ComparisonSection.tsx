import { Reveal } from '@/shared/design/ui/Reveal'
import { SectionHeading } from '@/shared/design/ui/SectionHeading'
import type { Dictionary } from '@/shared/i18n/dictionaries'

export function ComparisonSection({ dictionary }: { dictionary: Dictionary }) {
  const { comparison } = dictionary

  return (
    <section aria-labelledby="comparison-title" className="px-6 py-24" id="diferencia">
      <div className="mx-auto max-w-[1180px]">
        <SectionHeading eyebrow={comparison.eyebrow} title={<span id="comparison-title">{comparison.title}</span>} />

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <Reveal className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-bg-raised p-8 shadow-[var(--shadow-float)]">
            <p className="font-display text-[26px] text-gold-deep">LUXE</p>
            <ul className="mt-6 flex flex-col gap-4">
              {comparison.luxe.map((item) => (
                <li key={item} className="flex gap-3 text-[14px] leading-[1.6] text-ink-soft">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-bg-sunken p-8" delay={0.1}>
            <p className="font-display text-[26px] text-ink-mute">{comparison.traditionalLabel}</p>
            <ul className="mt-6 flex flex-col gap-4">
              {comparison.traditional.map((item) => (
                <li key={item} className="flex gap-3 text-[14px] leading-[1.6] text-ink-mute">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-mute/50" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
