import type { ItineraryRow } from '../../../../domain/invitation-content'
import { Reveal } from '../Reveal'
import { timelineIcon } from './TimelineIcons'

type Props = {
  readonly accent: string
  readonly items: readonly ItineraryRow[]
  /** El fondo del disco del icono: tapa la línea vertical que pasa por detrás. */
  readonly discBg: string
  readonly labelLetterSpacing?: string
  readonly timeColor?: string
}

/**
 * El itinerario en columna, con su línea vertical y un icono por fila.
 *
 * El disco del icono lleva **fondo opaco** a propósito: la línea central pasa por detrás
 * de todos, y sin el disco la atraviesa por el medio del dibujo. Por eso el fondo entra
 * por prop y no es transparente — cada diseño tiene el suyo.
 *
 * El icono sale de `imageId`, que aquí no es una imagen del evento sino la **clave** del
 * dibujo: `church`, `flutes`, `cake`. Reutiliza el campo en vez de añadir otro porque la
 * fila ya tiene un sitio para decir cómo se ilustra, y ningún diseño usa las dos cosas a
 * la vez.
 */
export function BotanicalTimeline({ accent, items, discBg, labelLetterSpacing = '0.25em', timeColor }: Props) {
  return (
    <div style={{ position: 'relative', padding: '12px 0 8px' }}>
      <div aria-hidden style={{ position: 'absolute', left: 35, top: 30, bottom: 30, width: 1, background: accent, opacity: 0.55 }} />
      {items.map((fila, indice) => {
        const Icono = timelineIcon(fila.imageId)
        return (
          <Reveal delay={indice * 80} key={`${fila.time}-${fila.label}`}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 22, position: 'relative' }}>
              <div style={{ position: 'relative', width: 72, display: 'flex', justifyContent: 'center' }}>
                <div
                  style={{
                    position: 'relative',
                    width: 56,
                    height: 56,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: discBg,
                  }}
                >
                  <Icono color={accent} size={36} />
                </div>
              </div>
              <div aria-hidden style={{ position: 'absolute', left: 32, top: 26, width: 7, height: 7, borderRadius: '50%', background: accent }} />
              <div aria-hidden style={{ position: 'absolute', left: 60, top: 28, width: 18, height: 1, background: accent, opacity: 0.55 }} />
              <div style={{ flex: 1, paddingTop: 14 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-cormorant)',
                    fontSize: 13,
                    fontWeight: 500,
                    letterSpacing: labelLetterSpacing,
                    textTransform: 'uppercase',
                    color: accent,
                  }}
                >
                  {fila.label}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontFamily: 'var(--font-cormorant)',
                    fontSize: 16,
                    fontStyle: 'italic',
                    color: timeColor ?? accent,
                    opacity: timeColor === undefined ? 0.85 : 1,
                  }}
                >
                  {fila.time}
                </div>
              </div>
            </div>
          </Reveal>
        )
      })}
    </div>
  )
}
