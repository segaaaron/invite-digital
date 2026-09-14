import Image from 'next/image'
import type { Category } from '@/modules/catalog'
import { BRAND } from '@/shared/config/brand'
import { GlassPanel } from '@/shared/design/ui/GlassPanel'
import { WhatsAppIcon } from '@/shared/design/ui/icons'
import { Reveal } from '@/shared/design/ui/Reveal'
import { SectionHeading } from '@/shared/design/ui/SectionHeading'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Locale } from '@/shared/i18n/locales'
import { buildWhatsAppLink } from '../domain/whatsapp-link'
import { ConsultationForm } from './ConsultationForm'

type Props = { categories: readonly Category[]; dictionary: Dictionary; locale: Locale }

export function ContactSection({ categories, dictionary, locale }: Props) {
  const { contact } = dictionary
  const whatsappHref = buildWhatsAppLink({ message: contact.whatsappMessage })

  return (
    <section aria-labelledby="contact-title" className="px-6 py-24" id="contacto">
      {/* Dos columnas iguales y centradas entre sí, como la maqueta: con una columna más
          ancha que la otra y alineadas arriba, el formulario quedaba desencajado del
          bloque de texto. */}
      <div className="mx-auto grid max-w-[1240px] items-center gap-14 lg:grid-cols-2">
        <Reveal className="flex flex-col gap-6">
          <SectionHeading
            align="left"
            eyebrow={contact.eyebrow}
            title={
              <span id="contact-title">
                {contact.title}{' '}
                <em className="bg-linear-to-r from-gold-deep via-gold-light to-gold-deep bg-clip-text text-transparent">
                  {contact.titleAccent}
                </em>
              </span>
            }
          />
          <p className="max-w-[42ch] text-[15px] leading-[1.75] text-ink-soft">{contact.body}</p>

          {/* Una línea por canal, con su icono delante: en la maqueta el rótulo y el dato
              van juntos, no apilados. */}
          <ul className="mt-2 flex flex-col gap-3.5">
            <li>
              <a
                className="flex items-center gap-2.5 text-[15px] text-ink transition-colors hover:text-gold-deep"
                href={whatsappHref}
                rel="noopener noreferrer"
                target="_blank"
              >
                <WhatsAppIcon className="text-gold-deep" />
                <span className="sr-only">{contact.whatsappLabel}: </span>
                WhatsApp {BRAND.whatsappDisplay}
              </a>
            </li>
            {/* Sin correo: el de la marca es no-reply y nadie lo responde. El contacto es WhatsApp. */}
          </ul>

          {/* La fotografía del taller que la maqueta pone bajo los datos de contacto. */}
          {/* La fotografía acompaña; no compite con el formulario. En la maqueta ocupa
              poco más de la mitad de la columna. */}
          <div className="relative mt-2 aspect-3/2 w-full max-w-[440px] overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] shadow-[var(--shadow-lift)]">
            <Image
              alt={contact.atelierAlt}
              className="object-cover"
              fill
              sizes="(min-width: 1024px) 440px, 100vw"
              src="/site/contacto/atelier.avif"
            />
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <GlassPanel>
            <ConsultationForm categories={categories} dictionary={dictionary} locale={locale} />
          </GlassPanel>
        </Reveal>
      </div>
    </section>
  )
}
