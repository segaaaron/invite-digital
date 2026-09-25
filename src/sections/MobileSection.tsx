import Image from '@/shared/design/ui/ImagenConCarga'
import { Reveal } from '@/shared/design/ui/Reveal'
import type { Dictionary } from '@/shared/i18n/dictionaries'

/**
 * Las capturas, en el orden del diccionario: **nuestras invitaciones de verdad**, abiertas en un
 * celular —«Botánica» para bodas y «Bajo el Mar» para XV—. Se sacaron de `/modelos/es/<clave>` a
 * 390 × 844 (pedido por el usuario: nada de fotos de archivo con invitaciones ajenas).
 */
const FOTOS = ['/site/movil/boda.avif', '/site/movil/xv.avif'] as const

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

        <Reveal className="flex items-start justify-center gap-5 sm:gap-8" delay={0.1}>
          {mobile.shots.map((shot, index) => (
            <figure className={`flex w-[46%] max-w-[250px] flex-col items-center gap-4 ${index === 1 ? 'mt-12' : ''}`} key={shot.tag}>
              {/* El celular: marco de tinta, isla arriba y la invitación a pantalla completa dentro. */}
              <div className="relative w-full rounded-[38px] bg-ink p-[7px] shadow-[var(--shadow-lift)] transition-transform duration-500 ease-[cubic-bezier(.19,1,.22,1)] hover:-translate-y-2.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                <div className="relative aspect-[390/844] overflow-hidden rounded-[31px] bg-bg-sunken">
                  <Image alt={shot.alt} className="object-cover object-top" fill sizes="(min-width: 1024px) 250px, 46vw" src={FOTOS[index] ?? FOTOS[0]} />
                  <span aria-hidden className="absolute top-2.5 left-1/2 h-[18px] w-[30%] -translate-x-1/2 rounded-full bg-ink" />
                </div>
              </div>
              <figcaption className="flex flex-col items-center gap-1 text-center">
                <span className="font-mono text-[9px] tracking-[var(--tracking-luxe)] text-gold-deep uppercase">{shot.tag}</span>
                <span className="text-[13px] text-ink">{shot.caption}</span>
              </figcaption>
            </figure>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
