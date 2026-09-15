import type { ReactNode } from 'react'
import type { Template } from '@/modules/catalog'
import { TemplateCard } from '@/modules/catalog/ui/TemplateCard'
import { fiestaDeCategoria, type Fiesta } from '@/modules/events'
import { Button } from '@/shared/design/ui/Button'
import { CheckIcon } from '@/shared/design/ui/icons'
import { SectionHeading } from '@/shared/design/ui/SectionHeading'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Locale } from '@/shared/i18n/locales'

/** Los modelos de una fiesta. La boda civil es boda; los XV van aparte. */
export const plantillasDeFiesta = (templates: readonly Template[], fiesta: Fiesta): Template[] =>
  templates.filter((template) => fiestaDeCategoria(template.categorySlug) === fiesta)

/**
 * La página de una fiesta: `/bodas` o `/xv-anos`. Bodas y XV son dos productos, y cada uno
 * enseña solo sus modelos, lo que el panel ya hace y los precios.
 *
 * **Las herramientas salen del diccionario y solo nombran lo que existe.** Lo que llegue con
 * el planner se añade aquí cuando esté construido, no antes.
 */
export function FiestaLanding({
  dictionary,
  locale,
  fiesta,
  templates,
  pricing,
}: {
  dictionary: Dictionary
  locale: Locale
  fiesta: Fiesta
  templates: readonly Template[]
  /** La sección de precios ya compuesta por la página, o `null` si el catálogo no responde. */
  pricing: ReactNode
}) {
  const textos = dictionary.fiestas[fiesta]
  const suyas = plantillasDeFiesta(templates, fiesta)

  return (
    <>
      <section className="px-5 pb-16 pt-[clamp(132px,16vw,168px)]" id="hero">
        <div className="mx-auto flex max-w-[860px] flex-col items-center gap-6 text-center">
          <span className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-gold-deep">{textos.eyebrow}</span>
          <h1 className="font-display text-[clamp(40px,7vw,76px)] font-light leading-[1.02] text-ink [text-wrap:balance]">{textos.title}</h1>
          <p className="max-w-[58ch] text-[16px] leading-[1.7] text-ink-soft">{textos.lede}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button href="#modelos">{textos.modelsTitle}</Button>
            <Button href="#precios" variant="ghost">
              {textos.cta}
            </Button>
          </div>
        </div>
      </section>

      {suyas.length > 0 ? (
        <section aria-labelledby="modelos-fiesta" className="px-6 py-20" id="modelos">
          <div className="mx-auto max-w-[1240px]">
            <div className="flex flex-col items-center gap-4 text-center">
              <SectionHeading eyebrow={textos.eyebrow} title={<span id="modelos-fiesta">{textos.modelsTitle}</span>} />
              <p className="max-w-[46ch] text-[15px] text-ink-soft">{textos.modelsSubtitle}</p>
            </div>
            <div className="mt-16 grid grid-cols-2 place-items-center gap-x-6 gap-y-14 md:grid-cols-4">
              {suyas.map((template) => (
                <TemplateCard dictionary={dictionary} key={template.id} locale={locale} template={template} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="herramientas" className="px-6 py-20">
        <div className="mx-auto max-w-[1080px]">
          <SectionHeading eyebrow={dictionary.fiestas.toolsEyebrow} title={<span id="herramientas">{dictionary.fiestas.toolsTitle}</span>} />
          <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {dictionary.fiestas.tools.map((herramienta) => (
              <li className="flex flex-col gap-2 rounded-[18px] border border-[var(--color-line)] bg-bg-raised p-6" key={herramienta.title}>
                <span aria-hidden className="grid size-8 place-items-center rounded-full bg-gold/15 text-gold-deep">
                  <CheckIcon className="size-4" />
                </span>
                <h3 className="font-display text-[22px] leading-tight text-ink">{herramienta.title}</h3>
                <p className="text-[14px] leading-[1.65] text-ink-soft">{herramienta.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {pricing}
    </>
  )
}
