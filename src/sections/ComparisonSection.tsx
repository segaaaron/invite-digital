import { BRAND } from '@/shared/config/brand'
import { CompareSlider } from './CompareSlider'
import { CompareStacked } from './CompareStacked'
import { Reveal } from '@/shared/design/ui/Reveal'
import { SectionHeading } from '@/shared/design/ui/SectionHeading'
import type { Dictionary } from '@/shared/i18n/dictionaries'

export function ComparisonSection({ dictionary }: { dictionary: Dictionary }) {
  const { comparison } = dictionary

  return (
    <section aria-labelledby="comparison-title" className="px-6 py-24" id="diferencia">
      <div className="mx-auto max-w-[1180px]">
        <SectionHeading eyebrow={comparison.eyebrow} title={<span id="comparison-title">{comparison.title}</span>} />

        <p className="mt-4 hidden text-center text-[12px] md:block tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
          {comparison.hint}
        </p>

        {/* En el teléfono se compara bajando; el deslizador, desde la tableta. */}
        <Reveal className="mt-10 md:hidden">
          <CompareStacked
            luxe={comparison.luxe}
            luxeLabel={BRAND.siteName}
            traditional={comparison.traditional}
            traditionalLabel={comparison.traditionalLabel}
          />
        </Reveal>

        <Reveal className="mt-10 hidden md:block">
          <CompareSlider
            imageAlt={comparison.imageAlt}
            luxe={comparison.luxe}
            luxeLabel={BRAND.siteName}
            phoneCaption={comparison.phoneCaption}
            phoneCta={comparison.phoneCta}
            sliderLabel={comparison.sliderLabel}
            traditional={comparison.traditional}
            traditionalLabel={comparison.traditionalLabel}
          />
        </Reveal>
      </div>
    </section>
  )
}
