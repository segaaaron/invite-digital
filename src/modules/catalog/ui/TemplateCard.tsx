import Image from 'next/image'
import Link from 'next/link'
import type { Locale } from '@/shared/i18n/locales'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Template } from '../domain/template'

type Props = { template: Template; dictionary: Dictionary; locale: Locale }

/**
 * La tarjeta de modelo: **la portada de la invitación de verdad**.
 *
 * Antes se dibujaba una tarjeta de papel con el monograma, los nombres y la fecha de
 * muestra. Era elegante, pero era un dibujo nuestro: dos diseños distintos se veían casi
 * igual —cambiaban el color del filete y poco más— y lo que el cliente compraba no se
 * parecía a lo que había elegido. Ahora se enseña la portada capturada de cada diseño,
 * que es exactamente lo que va a recibir el invitado al abrir su enlace.
 *
 * La proporción es la del teléfono, no la del papel: una portada recortada a 5:7 perdía el
 * pie —donde estos diseños ponen la llamada a entrar— o la cabecera.
 *
 * **La tarjeta entera es un enlace** a la invitación de verdad; el `slug` de la plantilla
 * **es** la clave del tema, así que no puede llevar a un diseño distinto del que enseña.
 */
export function TemplateCard({ template, dictionary, locale }: Props) {
  const { models } = dictionary

  return (
    <Link
      aria-label={`${models.open} · ${template.name}`}
      className="group m-0 flex w-[238px] shrink-0 flex-col items-center gap-5 outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-4"
      href={`/modelos/${locale}/${template.slug}`}
    >
      <div
        className="relative aspect-[9/16] w-full overflow-hidden rounded-[14px] [transform:rotateY(-11deg)_rotateX(3deg)] [transform-style:preserve-3d] transition-transform duration-500 ease-[cubic-bezier(.19,1,.22,1)] group-hover:[transform:rotateY(0deg)_rotateX(0deg)_translateY(-8px)] group-focus-visible:[transform:rotateY(0deg)_rotateX(0deg)_translateY(-8px)] motion-reduce:transition-none"
        style={{
          background: template.palette.base,
          boxShadow: '0 26px 50px -24px rgb(90 66 26 / 0.5)',
        }}
      >
        <Image
          alt={template.name}
          className="h-full w-full object-cover"
          height={996}
          sizes="(max-width: 768px) 80vw, 280px"
          src={template.coverImagePath}
          width={560}
        />
        {/* El filete de oro del sitio, por dentro: separa la portada del papel del fondo sin
            taparle nada. */}
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[14px] border border-line" />
      </div>

      <span className="font-display text-[20px] font-light text-ink">{template.name}</span>
    </Link>
  )
}
