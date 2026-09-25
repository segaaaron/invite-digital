import Image from '@/shared/design/ui/ImagenConCarga'
import type { ReactNode } from 'react'
import type { Category } from '@/modules/catalog'
import { GlassPanel } from '@/shared/design/ui/GlassPanel'
import { WhatsAppIcon } from '@/shared/design/ui/icons'
import { Reveal } from '@/shared/design/ui/Reveal'
import { SectionHeading } from '@/shared/design/ui/SectionHeading'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Locale } from '@/shared/i18n/locales'
import { buildWhatsAppLink } from '../domain/whatsapp-link'
import { ConsultationForm } from './ConsultationForm'

type Props = {
  categories: readonly Category[]
  dictionary: Dictionary
  locale: Locale
  /** De «La web». Sin número, la línea de WhatsApp no se pinta: queda el formulario. */
  contacto: { whatsapp: string; whatsappVisible: string; horario: string; mensaje: string }
  /** El aviso bajo el formulario; `null` sin política de privacidad publicada. */
  privacidad: ReactNode
}

export function ContactSection({ categories, dictionary, locale, contacto, privacidad }: Props) {
  const { contact } = dictionary
  const whatsappHref = buildWhatsAppLink(contacto.whatsapp, contacto.mensaje)

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
          {whatsappHref === null ? null : (
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
                  WhatsApp {contacto.whatsappVisible}
                </a>
                {/* La expectativa de respuesta, junto al enlace: un WhatsApp que nadie
                    contesta a tiempo resta más de lo que suma. */}
                {contacto.horario === '' ? null : <p className="mt-1.5 pl-7 text-[13px] text-ink-mute">{contacto.horario}</p>}
              </li>
            </ul>
          )}

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
            <div className="mt-4">{privacidad}</div>
          </GlassPanel>
        </Reveal>
      </div>
    </section>
  )
}
