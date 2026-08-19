import { GlassPanel } from '@/shared/design/ui/GlassPanel'
import { Reveal } from '@/shared/design/ui/Reveal'
import { SectionHeading } from '@/shared/design/ui/SectionHeading'
import type { Dictionary } from '@/shared/i18n/dictionaries'

export function TestimonialsSection({ dictionary }: { dictionary: Dictionary }) {
  const { testimonials } = dictionary

  return (
    <section className="px-6 py-24" id="testimonios">
      <div className="mx-auto max-w-[1180px]">
        <SectionHeading eyebrow={testimonials.eyebrow} title={testimonials.title} />

        <div className="mx-auto mt-14 grid max-w-[560px] gap-6">
          {testimonials.items.map((item, index) => (
            <Reveal delay={index * 0.1} key={item.author}>
              <GlassPanel className="flex h-full flex-col gap-6 p-8">
                <span aria-hidden="true" className="font-display text-[40px] leading-none text-gold-deep">
                  “
                </span>
                <blockquote className="flex-1 font-display text-[20px] font-light italic leading-[1.4] text-ink">
                  {item.quote}
                </blockquote>
                <footer className="flex flex-col gap-1">
                  <span className="font-display text-[17px] not-italic text-ink">{item.author}</span>
                  <span className="text-[10.5px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">{item.role}</span>
                </footer>
              </GlassPanel>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
