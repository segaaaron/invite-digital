import { Reveal } from '@/shared/design/ui/Reveal'
import { SectionHeading } from '@/shared/design/ui/SectionHeading'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Locale } from '@/shared/i18n/locales'
import type { Template } from '../domain/template'
import { MasModelos } from './MasModelos'
import { TemplateCard } from './TemplateCard'

type Props = { templates: readonly Template[]; dictionary: Dictionary; locale: Locale }

/** De cuántos en cuántos modelos se enseñan: dos filas de cuatro. */
const TANDA = 8

export function ModelsSection({ templates, dictionary, locale }: Props) {
  const { models } = dictionary

  return (
    <section aria-labelledby="models-title" className="px-6 py-24" id="modelos">
      <div className="mx-auto max-w-[1240px]">
        <div className="flex flex-col items-center gap-4 text-center">
          <SectionHeading eyebrow={models.eyebrow} title={<span id="models-title">{models.title}</span>} />
          <p className="max-w-[46ch] text-[15px] text-ink-soft">{models.subtitle}</p>
        </div>

        <MasModelos etiqueta={dictionary.collections.loadMore} tanda={TANDA}>
          {templates.map((template, index) => (
            <Reveal key={template.id} delay={(index % 4) * 0.08}>
              <TemplateCard dictionary={dictionary} locale={locale} template={template} />
            </Reveal>
          ))}
        </MasModelos>
      </div>
    </section>
  )
}
