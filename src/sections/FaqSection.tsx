import { SectionHeading } from '@/shared/design/ui/SectionHeading'
import { Reveal } from '@/shared/design/ui/Reveal'
import type { Dictionary } from '@/shared/i18n/dictionaries'

export function FaqSection({ dictionary }: { dictionary: Dictionary }) {
  const { faq } = dictionary

  return (
    <section className="px-6 py-24" id="faq">
      <div className="mx-auto max-w-[820px]">
        <SectionHeading eyebrow={faq.eyebrow} title={faq.title} />

        <div className="mt-12 flex flex-col divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
          {faq.items.map((item, index) => (
            <Reveal delay={index * 0.05} key={item.question}>
              <details className="group py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[16px] text-ink marker:content-none">
                  {item.question}
                  <span aria-hidden="true" className="shrink-0 text-[20px] font-light text-gold-deep transition-transform duration-300 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-4 max-w-[62ch] text-[14.5px] leading-[1.75] text-ink-soft">{item.answer}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
