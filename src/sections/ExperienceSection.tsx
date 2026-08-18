import { GlassPanel } from '@/shared/design/ui/GlassPanel'
import { Reveal } from '@/shared/design/ui/Reveal'
import { SectionHeading } from '@/shared/design/ui/SectionHeading'
import type { Dictionary } from '@/shared/i18n/dictionaries'

export function ExperienceSection({ dictionary }: { dictionary: Dictionary }) {
  const { experience } = dictionary

  return (
    <section className="px-6 py-24" id="experiencia">
      <div className="mx-auto max-w-[1180px]">
        <SectionHeading eyebrow={experience.eyebrow} title={experience.title} />

        <div className="mt-16 grid gap-7 md:grid-cols-3">
          {experience.acts.map((act, index) => {
            const featured = index === 2

            return (
              <Reveal key={act.label} delay={index * 0.1}>
                {featured ? (
                  <div className="flex h-full flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-ink p-8 shadow-[var(--shadow-lift)]">
                    <span className="text-[10px] uppercase tracking-[var(--tracking-luxe)] text-gold-light">{act.label}</span>
                    <h3 className="font-display text-[27px] font-normal leading-tight text-bg-raised">{act.title}</h3>
                    <p className="text-[14.5px] leading-[1.7] text-bg-sunken">{act.body}</p>
                  </div>
                ) : (
                  <GlassPanel className="flex h-full flex-col gap-4 p-8">
                    <span className="text-[10px] uppercase tracking-[var(--tracking-luxe)] text-gold-deep">{act.label}</span>
                    <h3 className="font-display text-[27px] font-normal leading-tight text-ink">{act.title}</h3>
                    <p className="text-[14.5px] leading-[1.7] text-ink-soft">{act.body}</p>
                  </GlassPanel>
                )}
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
