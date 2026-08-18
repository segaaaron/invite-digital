import Link from 'next/link'
import { notFound } from 'next/navigation'
import { catalog } from '@/app/composition/container'
import { TemplateCard } from '@/modules/catalog/ui/TemplateCard'
import { BRAND } from '@/shared/config/brand'
import { SectionHeading } from '@/shared/design/ui/SectionHeading'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { parseLocaleParam } from '@/shared/i18n/server'
import { isOk } from '@/shared/result'

export const revalidate = 300

export default async function CollectionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = parseLocaleParam(raw)
  if (!locale) notFound()

  const dictionary = getDictionary(locale)
  const templatesResult = await catalog.listTemplates(locale)

  if (!isOk(templatesResult)) {
    console.error('No se pudieron cargar las plantillas del catálogo:', templatesResult.error.detail)

    const whatsappHref = `https://wa.me/${BRAND.whatsapp.replace(/\D/g, '')}`

    return (
      <section className="px-6 py-24">
        <div className="mx-auto flex max-w-[520px] flex-col items-center gap-6 text-center">
          <SectionHeading eyebrow={dictionary.collections.eyebrow} title={dictionary.collections.title} />
          <p className="text-[14px] leading-[1.7] text-ink-soft">{dictionary.collections.errorMessage}</p>
          <a
            className="rounded-[var(--radius-pill)] bg-gold px-7 py-3.5 text-[12px] uppercase tracking-[var(--tracking-luxe)] text-bg-raised"
            href={whatsappHref}
            rel="noopener noreferrer"
            target="_blank"
          >
            {BRAND.whatsappDisplay}
          </a>
        </div>
      </section>
    )
  }

  const templates = templatesResult.value

  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-[1240px]">
        <div className="flex flex-col items-center gap-4 text-center">
          <SectionHeading eyebrow={dictionary.collections.eyebrow} title={dictionary.collections.title} />
          <p className="max-w-[46ch] text-[15px] text-ink-soft">{dictionary.models.subtitle}</p>
        </div>

        <div className="mt-16 grid grid-cols-2 place-items-center gap-x-6 gap-y-14 md:grid-cols-4">
          {templates.map((template) => (
            <TemplateCard dictionary={dictionary} key={template.id} template={template} />
          ))}
        </div>

        <div className="mt-16 flex justify-center">
          <Link
            className="rounded-[var(--radius-pill)] border border-[var(--color-line)] px-7 py-3 text-[12px] uppercase tracking-[var(--tracking-luxe)] text-ink transition-colors hover:border-gold"
            href={`/${locale}`}
          >
            {dictionary.collections.backToHome}
          </Link>
        </div>
      </div>
    </section>
  )
}
