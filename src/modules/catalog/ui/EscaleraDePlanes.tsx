import Image from 'next/image'
import type { PricingDictionary } from '@/shared/i18n/dictionary'

/** Los iconos de cada peldaño (V4): el catálogo, el pincel y la corona. */
const ICONOS = [
  <svg aria-hidden fill="none" height="20" key="catalogo" stroke="currentColor" strokeWidth="1.4" viewBox="0 0 20 20" width="20">
    <rect height="7" rx="1.5" width="7" x="2" y="2" />
    <rect height="7" rx="1.5" width="7" x="11" y="2" />
    <rect height="7" rx="1.5" width="7" x="2" y="11" />
    <rect height="7" rx="1.5" width="7" x="11" y="11" />
  </svg>,
  <svg aria-hidden fill="none" height="20" key="pincel" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" viewBox="0 0 20 20" width="20">
    <path d="M17 3 L9 11" />
    <path d="M9 11 C6 10 3.5 12 3.5 15 C3.5 16 3 17 2 17.5 C5.5 18 9.5 16.5 9 11 Z" />
  </svg>,
  <svg aria-hidden fill="none" height="20" key="corona" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" viewBox="0 0 20 20" width="20">
    <path d="M3 15 L2 6 L6.5 9.5 L10 4 L13.5 9.5 L18 6 L17 15 Z" />
    <path d="M3 17.5 H17" />
  </svg>,
] as const

/**
 * «Nivel de personalización» (documento de cambios, V4): una escalera de tres peldaños —el modelo
 * tal cual, adaptado a tu gusto, creado para ti—, con el antes y después de Gala (el mismo modelo
 * en otro color) y el ejemplo de Imperial.
 */
export function EscaleraDePlanes({ planes, textos }: { readonly planes: readonly string[]; readonly textos: PricingDictionary['ladder'] }) {
  return (
    <div className="mt-24">
      <div className="text-center">
        <h3 className="font-display text-[30px] font-light text-ink">
          {textos.title} <em className="text-gold-deep">{textos.titleAccent}</em>
        </h3>
        <p className="mt-2 text-[14px] text-ink-soft">{textos.sub}</p>
      </div>
      <ol className="mt-10 grid gap-5 md:grid-cols-3 md:items-end">
        {textos.rungs.map((peldano, i) => (
          <li
            className={`flex flex-col gap-3 rounded-[20px] border p-7 ${
              i === 1 ? 'border-gold/50 bg-bg-raised shadow-[var(--shadow-float)]' : 'border-[var(--color-line)] bg-bg-raised/70'
            }`}
            key={peldano.title}
            // Cada peldaño sube un poco más que el anterior: es una escalera.
            style={{ marginBottom: i * 18 }}
          >
            <span className="flex items-center gap-3 text-gold-deep">
              <span className="flex size-9 items-center justify-center rounded-full border border-gold/40">{ICONOS[i]}</span>
              <span className="font-mono text-[10px] tracking-[var(--tracking-luxe)] uppercase">{planes[i] ?? ''}</span>
            </span>
            <h4 className="font-display text-[24px] text-ink">{peldano.title}</h4>
            <p className="text-[14px] leading-[1.7] text-ink-soft">{peldano.body}</p>
            {i === 1 ? (
              <div className="mt-2 grid grid-cols-2 gap-3">
                {[
                  { src: '/site/planes/antes.avif', alt: textos.beforeAlt, pie: textos.before },
                  { src: '/site/planes/despues.avif', alt: textos.afterAlt, pie: textos.after },
                ].map((foto) => (
                  <figure className="flex flex-col gap-1.5" key={foto.src}>
                    <span className="relative block aspect-[520/743] overflow-hidden rounded-[12px] border border-[var(--color-line)]">
                      <Image alt={foto.alt} fill sizes="160px" src={foto.src} style={{ objectFit: 'cover' }} unoptimized />
                    </span>
                    <figcaption className="text-center text-[11.5px] text-ink-mute">{foto.pie}</figcaption>
                  </figure>
                ))}
              </div>
            ) : null}
            {i === 2 ? <p className="text-[13px] italic leading-[1.6] text-gold-deep">{textos.example}</p> : null}
          </li>
        ))}
      </ol>
    </div>
  )
}
