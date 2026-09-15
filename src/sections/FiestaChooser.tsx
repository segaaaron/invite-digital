import Image from 'next/image'
import Link from 'next/link'
import { ArrowRightIcon } from '@/shared/design/ui/icons'
import { SectionHeading } from '@/shared/design/ui/SectionHeading'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Locale } from '@/shared/i18n/locales'

/**
 * Las dos puertas de la portada: Bodas y XV años. Son dos fiestas y dos productos, y cada
 * una lleva a su página con sus modelos.
 */
export function FiestaChooser({ dictionary, locale }: { dictionary: Dictionary; locale: Locale }) {
  const tarjetas = [
    { href: `/${locale}/bodas`, textos: dictionary.fiestas.boda, imagen: '/site/colecciones/bodas-1.avif' },
    { href: `/${locale}/xv-anos`, textos: dictionary.fiestas.xv, imagen: '/site/colecciones/xv-1.avif' },
  ]

  return (
    <section aria-labelledby="que-celebras" className="px-6 py-20" id="fiestas">
      <div className="mx-auto max-w-[1080px]">
        <SectionHeading eyebrow={dictionary.fiestas.chooserEyebrow} title={<span id="que-celebras">{dictionary.fiestas.chooserTitle}</span>} />
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {tarjetas.map(({ href, textos, imagen }) => (
            <Link
              className="group relative flex min-h-[340px] flex-col justify-end overflow-hidden rounded-[24px] border border-[var(--color-line)] p-8 text-white shadow-[var(--shadow-float)]"
              href={href}
              key={href}
            >
              <Image alt="" className="object-cover object-[center_15%] transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none" fill sizes="(max-width: 768px) 100vw, 540px" src={imagen} />
              <span aria-hidden className="absolute inset-0 bg-linear-to-t from-shell-deep/85 via-shell-deep/30 to-transparent" />
              <span className="relative flex flex-col gap-2">
                <span className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-gold-light">{textos.eyebrow}</span>
                <span className="font-display text-[40px] leading-none">{textos.cardTitle}</span>
                <span className="max-w-[36ch] text-[14px] leading-[1.6] text-white/85">{textos.cardBody}</span>
                <span className="mt-2 inline-flex items-center gap-2 text-[12px] uppercase tracking-[var(--tracking-luxe)]">
                  {dictionary.fiestas.chooserCta} <ArrowRightIcon className="size-4" />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
