import Image from 'next/image'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Template } from '../domain/template'

type Props = { template: Template; dictionary: Dictionary }

/** El icono de código QR de la maqueta. */
function QrIcon() {
  return (
    <svg aria-hidden fill="none" height="13" stroke="currentColor" strokeWidth="1.3" viewBox="0 0 24 24" width="13">
      <rect height="7" width="7" x="3" y="3" />
      <rect height="7" width="7" x="14" y="3" />
      <rect height="7" width="7" x="3" y="14" />
      <path d="M14 14h3v3h-3zM20 20h1" />
    </svg>
  )
}

/** El icono de apertura de la maqueta. */
function PlayIcon() {
  return (
    <svg aria-hidden fill="currentColor" height="13" viewBox="0 0 24 24" width="13">
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  )
}

/**
 * La tarjeta de modelo, portada de la maqueta: **la invitación dibujada**, no una
 * fotografía.
 *
 * Se compone la pieza —categoría, monograma, nombres, fecha y lugar— sobre papel con su
 * doble filete y su cinta. Una foto de relleno no enseña el modelo, que es exactamente lo
 * que el cliente viene a mirar en esta sección.
 *
 * Sin muestra cargada cae a la fotografía de la plantilla: media tarjeta con el monograma
 * y sin nombres se leería como un fallo de carga.
 */
export function TemplateCard({ template, dictionary }: Props) {
  const { models } = dictionary
  const acento = template.palette.accent

  return (
    <figure className="m-0 flex w-[238px] shrink-0 flex-col items-center gap-5">
      <div
        className="relative aspect-5/7 w-full [transform:rotateY(-11deg)_rotateX(3deg)] [transform-style:preserve-3d] transition-transform duration-500 ease-[cubic-bezier(.19,1,.22,1)] hover:[transform:rotateY(0deg)_rotateX(0deg)_translateY(-8px)] motion-reduce:transition-none"
        style={{
          background: template.palette.base,
          boxShadow: '0 26px 50px -24px rgb(90 66 26 / 0.5), inset 0 0 0 1px rgb(255 255 255 / 0.3)',
        }}
      >
        {/* La segunda hoja que asoma detrás, como en la maqueta: da el grosor del papel. */}
        <span
          aria-hidden
          className="absolute -inset-x-[5%] -top-[4%] -bottom-[6%] -z-1 border"
          style={{ borderColor: `${acento}47` }}
        />

        {/* El doble filete del papel y la cinta del lomo, en el acento de la plantilla. */}
        <span aria-hidden className="absolute inset-2.5 border" style={{ borderColor: `${acento}6b` }} />
        <span aria-hidden className="absolute inset-4 border opacity-45" style={{ borderColor: `${acento}6b` }} />
        <span
          aria-hidden
          className="absolute -top-1 left-6 h-11 w-5 [clip-path:polygon(0_0,100%_0,100%_100%,50%_78%,0_100%)]"
          style={{ background: `linear-gradient(180deg, ${acento}, ${acento}88)` }}
        />

        {template.sample === null ? (
          <Image
            alt={template.name}
            className="h-full w-full object-cover"
            height={640}
            sizes="(max-width: 768px) 80vw, 280px"
            src={template.coverImagePath}
            width={450}
          />
        ) : (
          <div className="relative flex h-full flex-col items-center gap-2.5 px-6 pt-8 pb-6 text-center">
            <span className="font-mono text-[9px] tracking-[0.3em] uppercase" style={{ color: acento }}>
              {template.categoryName}
            </span>

            <span
              className="grid size-11 place-items-center rounded-full border font-display text-[13px] tracking-[0.06em]"
              style={{ borderColor: `${acento}6b`, color: acento }}
            >
              {template.sample.monogram}
            </span>

            <span className="font-display text-[24px] leading-[1.14] font-light italic" style={{ color: acento }}>
              {/* Cada línea, tal y como viene del catálogo. Añadir un «&» por el hecho de
                  haber dos líneas convertía «Gala / Anual» —el nombre de un evento
                  corporativo— en una pareja. */}
              {template.sample.names.split('\n').map((linea) => (
                <span className="block" key={linea}>
                  {linea}
                </span>
              ))}
            </span>

            <span aria-hidden className="my-1 h-px w-10" style={{ background: `${acento}55` }} />

            <span className="font-mono text-[11px] tracking-[0.18em] text-ink-soft">
              {template.sample.dateLabel}
            </span>
            <span className="text-[11.5px] text-ink-mute">{template.sample.venue}</span>

            <span className="mt-auto flex w-full items-center justify-between gap-2 border-t pt-3 text-[9px] tracking-[var(--tracking-luxe)] uppercase" style={{ borderColor: `${acento}3d`, color: acento }}>
              <span className="flex items-center gap-1.5">
                <QrIcon />
                {models.qr}
              </span>
              <span className="flex items-center gap-1.5 rounded-[var(--radius-pill)] border px-2.5 py-1" style={{ borderColor: `${acento}6b` }}>
                <PlayIcon />
                {models.open}
              </span>
            </span>
          </div>
        )}
      </div>

      <figcaption className="font-display text-[20px] font-light text-ink">{template.name}</figcaption>
    </figure>
  )
}
