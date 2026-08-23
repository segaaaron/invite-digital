import Image from 'next/image'
import { Reveal } from '@/shared/design/ui/Reveal'
import { SectionHeading } from '@/shared/design/ui/SectionHeading'
import type { Dictionary } from '@/shared/i18n/dictionaries'

export function TestimonialsSection({ dictionary }: { dictionary: Dictionary }) {
  const { testimonials } = dictionary

  return (
    <section className="px-6 py-24" id="testimonios">
      <div className="mx-auto max-w-[1180px]">
        <SectionHeading eyebrow={testimonials.eyebrow} title={testimonials.title} />

        {/* Retrato a la izquierda y cita a la derecha, como la maqueta: la persona que
            lo dice pesa tanto como lo dicho. */}
        <div className="mx-auto mt-14 flex max-w-[1180px] flex-col gap-6">
          {testimonials.items.map((item, index) => (
            <Reveal delay={index * 0.1} key={item.author}>
              <figure className="m-0 flex flex-wrap items-center gap-10 rounded-[var(--radius-card)] bg-bg-raised px-12 py-11 shadow-[var(--shadow-float)]">
                <div className="flex shrink-0 flex-col items-center gap-4 text-center">
                  <span className="relative size-[132px] overflow-hidden rounded-full border border-[var(--color-line)]">
                    <Image alt={item.author} className="object-cover" fill sizes="132px" src="/site/testimonios/daniela.avif" />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="font-display text-[19px] text-ink">{item.author}</span>
                    <span className="text-[10px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
                      {item.role}
                    </span>
                  </span>
                </div>

                <blockquote className="min-w-[280px] flex-1 font-display text-[27px] leading-[1.45] font-light text-ink italic">
                  “{item.quote}”
                </blockquote>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
