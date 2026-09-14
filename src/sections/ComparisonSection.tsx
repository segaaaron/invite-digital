import { BRAND } from '@/shared/config/brand'
import { CompareSlider } from './CompareSlider'
import { Reveal } from '@/shared/design/ui/Reveal'
import { SectionHeading } from '@/shared/design/ui/SectionHeading'
import type { Dictionary } from '@/shared/i18n/dictionaries'

export function ComparisonSection({ dictionary }: { dictionary: Dictionary }) {
  const { comparison } = dictionary

  return (
    <section aria-labelledby="comparison-title" className="px-6 py-24" id="diferencia">
      <div className="mx-auto max-w-[1180px]">
        <SectionHeading eyebrow={comparison.eyebrow} title={<span id="comparison-title">{comparison.title}</span>} />

        <p className="mt-4 text-center text-[12px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
          {comparison.hint}
        </p>

        <Reveal className="mt-10">
          <CompareSlider
            imageAlt={comparison.imageAlt}
            luxe={comparison.luxe}
            luxeLabel={BRAND.siteName}
            sliderLabel={comparison.sliderLabel}
            traditional={comparison.traditional}
            traditionalLabel={comparison.traditionalLabel}
          />
        </Reveal>
      </div>
    </section>
  )
}
