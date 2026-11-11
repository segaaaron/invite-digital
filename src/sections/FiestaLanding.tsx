import type { ReactNode } from 'react'
import type { Template } from '@/modules/catalog'
import { TemplateCard } from '@/modules/catalog/ui/TemplateCard'
import { fiestaDeCategoria, type Fiesta, type FiestaPublica } from '@/modules/events'
import { Button } from '@/shared/design/ui/Button'
import { SectionHeading } from '@/shared/design/ui/SectionHeading'
import { TestimonialsSection } from '@/sections/TestimonialsSection'
import { HerramientasDelPanel } from './HerramientasDelPanel'
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
  testimonios,
}: {
  dictionary: Dictionary
  locale: Locale
  fiesta: FiestaPublica
  templates: readonly Template[]
  /** La sección de precios ya compuesta por la página, o `null` si el catálogo no responde. */
  pricing: ReactNode
  /** Los testimonios confirmados de «La web»; sin ninguno, la sección no se pinta. */
  testimonios?: readonly { autor: string; rol: string; cita: string; foto: string }[]
}) {
  const textos = dictionary.fiestas[fiesta]
  const suyas = plantillasDeFiesta(templates, fiesta)

  return (
    <>
      <section className="px-5 pb-16 pt-[clamp(132px,16vw,168px)]" id="hero">
        <div className="mx-auto flex max-w-[860px] flex-col items-center gap-6 text-center">
          {/* El H1 dice lo que se busca y luego el lema (14 oct): solo con el lema, Google leía «Organiza tu boda
              desde un solo lugar». Se ve igual que antes: la búsqueda va como antetítulo dorado. */}
          <h1 className="flex flex-col items-center gap-6">
            <span className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-gold-deep">{textos.busqueda}</span>
            <span className="font-display text-[clamp(40px,7vw,76px)] font-light leading-[1.02] text-ink [text-wrap:balance]">{textos.title}</span>
          </h1>
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

      <HerramientasDelPanel dictionary={dictionary} />

      <section aria-labelledby="para-planners" className="px-6 py-20">
        <div className="mx-auto flex max-w-[860px] flex-col items-center gap-5 rounded-[28px] border border-[var(--color-line)] bg-bg-raised px-6 py-14 text-center">
          <p className="font-mono text-[10px] tracking-[var(--tracking-luxe)] text-gold-deep uppercase">{textos.plannerEyebrow}</p>
          <h2 className="font-display text-[clamp(28px,4vw,40px)] leading-tight text-ink [text-wrap:balance]" id="para-planners">
            {textos.plannerTitle}
          </h2>
          <p className="font-display text-[clamp(18px,2.4vw,22px)] text-ink-soft [text-wrap:balance]">{textos.plannerSubtitle}</p>
          <p className="max-w-[58ch] text-[15px] leading-[1.7] text-ink-soft">{textos.plannerBody}</p>
        </div>
      </section>

      <TestimonialsSection dictionary={dictionary} testimonios={testimonios ?? []} />

      <section aria-labelledby="guia-fiesta" className="px-6 py-20">
        <div className="mx-auto max-w-[920px]">
          <div className="flex flex-col items-center gap-4 text-center">
            <SectionHeading eyebrow={textos.guia.eyebrow} title={<span id="guia-fiesta">{textos.guia.title}</span>} />
            <p className="max-w-[62ch] text-[15px] leading-[1.75] text-ink-soft">{textos.guia.intro}</p>
          </div>
          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {textos.guia.pasos.map((paso, i) => (
              <li className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-bg-raised p-6" key={paso.title}>
                <p className="font-mono text-[11px] tracking-[var(--tracking-luxe)] text-gold-deep">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="mt-2 font-display text-[22px] leading-tight text-ink">{paso.title}</h3>
                <p className="mt-2 text-[14px] leading-[1.7] text-ink-soft">{paso.body}</p>
              </li>
            ))}
          </ol>
          <h2 className="mt-16 text-center font-display text-[clamp(24px,3.4vw,32px)] leading-tight text-ink [text-wrap:balance]">{textos.guia.faqTitle}</h2>
          <dl className="mt-8 flex flex-col gap-6">
            {textos.guia.faq.map((item) => (
              <div key={item.question}>
                <dt className="font-display text-[19px] text-ink">{item.question}</dt>
                <dd className="mt-1.5 text-[14px] leading-[1.7] text-ink-soft">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {pricing}
    </>
  )
}
