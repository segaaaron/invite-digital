import { Reveal } from '@/shared/design/ui/Reveal'
import type { Dictionary } from '@/shared/i18n/dictionaries'

const VALUES = ['320+', '72 h', '94%', '7'] as const

export function StatsStrip({ dictionary }: { dictionary: Dictionary }) {
  const labels = [dictionary.stats.events, dictionary.stats.delivery, dictionary.stats.rsvp, dictionary.stats.countries]

  return (
    <section className="px-6 py-16">
      <Reveal className="mx-auto grid max-w-[1180px] grid-cols-2 gap-8 border-y border-[var(--color-line)] py-10 md:grid-cols-4">
        {labels.map((label, index) => (
          <div key={label} className="text-center">
            <p className="font-display text-[40px] font-light text-gold-deep">{VALUES[index]}</p>
            <p className="mt-2 text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">{label}</p>
          </div>
        ))}
      </Reveal>
    </section>
  )
}
