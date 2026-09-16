import Image from 'next/image'
import { Reveal } from '@/shared/design/ui/Reveal'
import type { Dictionary } from '@/shared/i18n/dictionaries'

/**
 * Las capturas, en el orden del diccionario. Solo se venden bodas y XV años: la del bautizo
 * se retiró, y la de XV entra en cuanto haya una fotografía suya.
 */
const FOTOS = ['/site/movil/pantalla.avif'] as const

export function MobileSection({ dictionary }: { dictionary: Dictionary }) {
  const { mobile } = dictionary

  return (
    <section className="px-6 py-24" id="movil">
      <div className="mx-auto grid max-w-[1180px] items-center gap-14 lg:grid-cols-2">
        <Reveal className="flex flex-col gap-6">
          <span className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-gold-deep">{mobile.eyebrow}</span>
          <h2 className="font-display text-[clamp(32px,4.2vw,56px)] font-light leading-[1.04] text-ink">{mobile.title}</h2>
          <p className="max-w-[46ch] text-[16px] leading-[1.75] text-ink-soft">{mobile.body}</p>
          <ul className="flex flex-col gap-3.5 text-[14.5px] text-ink">
            {mobile.bullets.map((bullet) => (
              <li key={bullet} className="flex items-center gap-3">
                <svg
                  aria-hidden="true"
                  className="shrink-0 text-gold-deep"
                  fill="none"
                  height="16"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.4"
                  viewBox="0 0 24 24"
                  width="16"
                >
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                {bullet}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className={`grid gap-5 ${mobile.shots.length > 1 ? 'grid-cols-2' : 'max-w-[320px]'}`} delay={0.1}>
          {mobile.shots.map((shot, index) => (
            <figure
              key={shot.tag}
              className={`overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-bg-raised shadow-[var(--shadow-lift)] transition-transform duration-500 ease-[cubic-bezier(.19,1,.22,1)] hover:-translate-y-2.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
                index === 1 ? 'mt-10' : ''
              }`}
            >
              <div className="relative aspect-3/4">
                <Image
                  alt={shot.alt}
                  className="object-cover"
                  fill
                  sizes="(min-width: 1024px) 280px, 45vw"
                  src={FOTOS[index] ?? FOTOS[0]}
                />
              </div>
              <figcaption className="flex flex-col gap-1 px-5 py-4">
                <span className="font-mono text-[9px] tracking-[var(--tracking-luxe)] text-gold-deep uppercase">
                  {shot.tag}
                </span>
                <span className="text-[13px] text-ink">{shot.caption}</span>
              </figcaption>
            </figure>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
