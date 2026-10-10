import { Reveal } from '@/shared/design/ui/Reveal'
import type { Dictionary } from '@/shared/i18n/dictionaries'

/**
 * **Quiénes somos** (9 oct, del informe de lanzamiento: «da confianza en un servicio de lujo»). Solo el texto
 * de la marca, por decisión del usuario: sin fotos ni lugar, porque se vende a toda América. A la izquierda
 * quién es la marca y su firma con el sello; a la derecha, tres pilares de lo que de verdad hace la plataforma.
 */
export function AboutSection({ dictionary }: { dictionary: Dictionary }) {
  const { about } = dictionary
  return (
    <section className="px-6 py-24" id="quienes-somos">
      <div className="mx-auto grid max-w-[1180px] items-start gap-14 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:gap-20">
        <Reveal>
          <div className="flex flex-col gap-6">
            <span className="text-[11px] tracking-[var(--tracking-luxe)] text-gold-deep uppercase">{about.eyebrow}</span>
            <h2 className="font-display text-[38px] leading-[1.12] font-normal text-ink min-[560px]:text-[46px]">{about.title}</h2>
            <span aria-hidden className="h-px w-16 bg-gold" />
            {about.paragraphs.map((p) => (
              <p className="max-w-[54ch] text-[16px] leading-[1.8] text-ink-soft" key={p}>
                {p}
              </p>
            ))}
            <p className="mt-2 flex items-center gap-3 text-[12px] tracking-[0.16em] text-gold-deep uppercase">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" className="size-9 drop-shadow-[0_2px_4px_rgb(104_80_36/0.25)]" height={36} src="/site/marca/sello-la-48-627a79b8.avif" srcSet="/site/marca/sello-la-48-627a79b8.avif 1x, /site/marca/sello-la-96-56d82990.avif 2x" width={36} />
              {about.signature}
            </p>
          </div>
        </Reveal>

        <ol className="flex flex-col gap-5">
          {about.pillars.map((pilar, i) => (
            <li key={pilar.title}>
              <Reveal delay={i * 0.1}>
                <div className="flex gap-5 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-bg-raised p-7 shadow-[var(--shadow-lift)]">
                  <span aria-hidden className="font-display text-[34px] leading-none text-gold lining-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex flex-col gap-2">
                    <h3 className="font-display text-[24px] leading-tight font-normal text-ink">{pilar.title}</h3>
                    <p className="text-[14.5px] leading-[1.7] text-ink-soft">{pilar.body}</p>
                  </div>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
