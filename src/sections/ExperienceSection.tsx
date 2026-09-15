import Image from 'next/image'
import { PlayIcon } from '@/shared/design/ui/icons'
import { Reveal } from '@/shared/design/ui/Reveal'
import { SectionHeading } from '@/shared/design/ui/SectionHeading'
import type { Dictionary } from '@/shared/i18n/dictionaries'

/**
 * Los tres actos, portados de la maqueta: cada tarjeta abre con su fotografía y el tercer
 * acto va en oscuro con el disco de reproducción encima, porque es la demo.
 */
const FOTOS = ['/site/experiencia/acto-1.avif', '/site/experiencia/acto-2.avif', '/site/experiencia/acto-3.avif'] as const
// La novia es vertical: centrada, el recorte 4:3 le cortaba la cara.
const ENCUADRE = ['object-center', 'object-[center_20%]', 'object-center'] as const

export function ExperienceSection({ dictionary }: { dictionary: Dictionary }) {
  const { experience } = dictionary

  return (
    <section className="px-6 py-24" id="experiencia">
      <div className="mx-auto max-w-[1180px]">
        <SectionHeading eyebrow={experience.eyebrow} title={experience.title} />

        <div className="mt-16 grid gap-7 md:grid-cols-3">
          {experience.acts.map((act, index) => {
            const featured = index === 2

            return (
              <Reveal key={act.label} delay={index * 0.1}>
                <article
                  className={`flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] shadow-[var(--shadow-lift)] ${
                    featured ? 'bg-ink' : 'bg-bg-raised'
                  }`}
                >
                  <div className="relative aspect-4/3">
                    <Image
                      alt={act.imageAlt}
                      className={`object-cover ${ENCUADRE[index] ?? 'object-center'}`}
                      fill
                      sizes="(min-width: 768px) 33vw, 100vw"
                      src={FOTOS[index] ?? FOTOS[0]}
                    />
                    {featured ? (
                      <span
                        aria-hidden
                        className="absolute inset-0 m-auto flex size-14 items-center justify-center rounded-full bg-white/90 text-ink shadow-[var(--shadow-lift)]"
                      >
                        <PlayIcon />
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-1 flex-col gap-4 p-8">
                    <span
                      className={`text-[10px] tracking-[var(--tracking-luxe)] uppercase ${featured ? 'text-gold-light' : 'text-gold-deep'}`}
                    >
                      {act.label}
                    </span>
                    <h3
                      className={`font-display text-[27px] leading-tight font-normal ${featured ? 'text-bg-raised' : 'text-ink'}`}
                    >
                      {act.title}
                    </h3>
                    <p className={`text-[14.5px] leading-[1.7] ${featured ? 'text-bg-sunken' : 'text-ink-soft'}`}>
                      {act.body}
                    </p>
                  </div>
                </article>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
