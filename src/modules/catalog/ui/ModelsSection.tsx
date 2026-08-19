import Link from 'next/link'
import { Reveal } from '@/shared/design/ui/Reveal'
import { SectionHeading } from '@/shared/design/ui/SectionHeading'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Locale } from '@/shared/i18n/locales'
import type { Template } from '../domain/template'
import { TemplateCard } from './TemplateCard'

type Props = { templates: readonly Template[]; dictionary: Dictionary; locale: Locale }

export function ModelsSection({ templates, dictionary, locale }: Props) {
  const { models } = dictionary

  return (
    <section aria-labelledby="models-title" className="px-6 py-24" id="modelos">
      <div className="mx-auto max-w-[1240px]">
        <div className="flex flex-col items-center gap-4 text-center">
          <SectionHeading eyebrow={models.eyebrow} title={<span id="models-title">{models.title}</span>} />
          <p className="max-w-[46ch] text-[15px] text-ink-soft">{models.subtitle}</p>
        </div>

        <div className="mt-16 grid grid-cols-2 place-items-center gap-x-6 gap-y-14 md:grid-cols-4">
          {templates.map((template, index) => (
            <Reveal key={template.id} delay={(index % 4) * 0.08}>
              <TemplateCard dictionary={dictionary} template={template} />
            </Reveal>
          ))}
        </div>

        <div className="mt-14 flex justify-center">
          <Link
            className="rounded-[var(--radius-pill)] border border-[var(--color-line)] px-7 py-3 text-[12px] uppercase tracking-[var(--tracking-luxe)] text-ink transition-colors hover:border-gold"
            href={`/${locale}/colecciones`}
          >
            {models.seeAll}
          </Link>
        </div>
      </div>
    </section>
  )
}
