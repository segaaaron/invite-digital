import Image from 'next/image'
import type { Category } from '@/modules/catalog'
import { BRAND } from '@/shared/config/brand'
import { GlassPanel } from '@/shared/design/ui/GlassPanel'
import { MailIcon, WhatsAppIcon } from '@/shared/design/ui/icons'
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
      <div className="mx-auto grid max-w-[1180px] items-start gap-14 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal className="flex flex-col gap-6">
          <SectionHeading
            align="left"
            eyebrow={contact.eyebrow}
            title={<span id="contact-title">{contact.title}</span>}
          />
          <p className="max-w-[42ch] text-[15px] leading-[1.75] text-ink-soft">{contact.body}</p>

          <dl className="mt-2 flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <dt className="flex items-center gap-2 text-[11px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
                <WhatsAppIcon className="text-gold-deep" />
                {contact.whatsappLabel}
              </dt>
              <dd>
                <a
                  className="font-display text-[22px] font-light text-ink underline-offset-4 hover:text-gold-deep hover:underline"
                  href={whatsappHref}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {BRAND.whatsappDisplay}
                </a>
              </dd>
            </div>

            <div className="flex flex-col gap-1">
              <dt className="flex items-center gap-2 text-[11px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
                <MailIcon className="text-gold-deep" />
                {contact.emailLabel}
              </dt>
              <dd>
                <a
                  className="text-[15px] text-ink-soft underline-offset-4 hover:text-gold-deep hover:underline"
                  href={`mailto:${BRAND.email}`}
                >
                  {BRAND.email}
                </a>
              </dd>
            </div>
          </dl>

          {/* La fotografía del taller que la maqueta pone bajo los datos de contacto. */}
          <div className="relative mt-4 aspect-16/11 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] shadow-[var(--shadow-lift)]">
            <Image
              alt={contact.atelierAlt}
              className="object-cover"
              fill
              sizes="(min-width: 1024px) 480px, 100vw"
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
