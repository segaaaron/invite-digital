import Image from 'next/image'

type Props = {
  luxeLabel: string
  luxe: readonly string[]
  traditionalLabel: string
  traditional: readonly string[]
}

/**
 * La comparativa en el teléfono: dos tarjetas una encima de otra —lo tradicional, apagado,
 * y lo nuestro, oscuro con el teléfono— unidas por el sello «VS».
 *
 * El deslizador de escritorio no sirve aquí: los dos paneles ocupan el ancho entero y a la
 * mitad del recorrido se leía medio renglón de cada uno, con el sello fuera de la vista.
 * En un teléfono se compara bajando, no arrastrando.
 */
export function CompareStacked({ luxeLabel, luxe, traditionalLabel, traditional }: Props) {
  return (
    <div className="flex flex-col">
      <div className="rounded-[var(--radius-card)] border border-line bg-bg-sunken bg-[radial-gradient(var(--color-line-panel-strong)_1px,transparent_1px)] bg-size-[14px_14px] px-6 pt-7 pb-9 shadow-[var(--shadow-card)]">
        <p className="font-display text-[26px] font-light text-ink-mute">{traditionalLabel}</p>
        <ul className="mt-4 flex flex-col gap-2.5">
          {traditional.map((item) => (
            <li key={item} className="flex items-start gap-3 text-[14px] leading-[1.55] text-ink-soft">
              <svg aria-hidden="true" className="mt-[5px] shrink-0 text-ink-mute" fill="none" height="12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" viewBox="0 0 24 24" width="12">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <span
        aria-hidden
        className="relative z-10 -my-6 flex size-12 items-center justify-center self-center rounded-full bg-linear-to-br from-gold-light to-gold-deep font-mono text-[10px] tracking-[0.2em] text-white shadow-[var(--shadow-float)]"
      >
        VS
      </span>

      <div className="overflow-hidden rounded-[var(--radius-card)] border border-gold/40 bg-ink px-6 pt-9 pb-7 shadow-[var(--shadow-lift)]">
        <div className="flex items-start gap-5">
          <div className="flex-1">
            <p className="font-display text-[26px] font-light text-gold-light">{luxeLabel}</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {luxe.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[14px] leading-[1.55] text-bg-sunken">
                  <svg aria-hidden="true" className="mt-[5px] shrink-0 text-gold-light" fill="none" height="12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="12">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div aria-hidden className="mt-1 hidden w-[92px] shrink-0 rotate-2 rounded-[16px] border border-gold/40 bg-ink p-1.5 shadow-[var(--shadow-float)] min-[400px]:block">
            <div className="relative aspect-[9/16] overflow-hidden rounded-[11px] bg-bg-sunken">
              <Image alt="" className="object-cover object-top" fill sizes="92px" src="/templates/boda-bot.avif" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
