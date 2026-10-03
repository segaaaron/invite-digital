import { SectionHeading } from '@/shared/design/ui/SectionHeading'
import type { Dictionary } from '@/shared/i18n/dictionaries'

/**
 * «Cómo funciona» del diseño por encargo: reservas, la diseñamos, pagas el saldo y la compartes.
 * Solo se pinta si algún plan es por encargo: con todos de autoservicio, sería mentira.
 */
export function ComoFunciona({ dictionary }: { dictionary: Dictionary }) {
  const { howItWorks } = dictionary
  return (
    <section aria-labelledby="como-funciona-titulo" className="px-6 py-20" id="como-funciona">
      <div className="mx-auto max-w-[1080px]">
        <SectionHeading eyebrow={howItWorks.eyebrow} title={<span id="como-funciona-titulo">{howItWorks.title}</span>} />
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {howItWorks.steps.map((paso, i) => (
            <li className="flex flex-col gap-3 rounded-[20px] border border-[var(--color-line)] bg-bg-raised/70 p-7" key={paso.title}>
              <span aria-hidden className="font-display text-[34px] leading-none text-gold-deep [font-variant-numeric:lining-nums]">
                0{i + 1}
              </span>
              <h3 className="font-display text-[22px] text-ink">{paso.title}</h3>
              <p className="text-[14px] leading-[1.7] text-ink-soft">{paso.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
